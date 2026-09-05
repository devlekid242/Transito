import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface TicketExportOptions {
  /** ID de l'élément conteneur (contient un ou plusieurs `.print-ticket`). */
  containerId: string;
  /** Nom de fichier SANS extension, ex: `billet-TKT-0001`. */
  fileName: string;
  /** Titre affiché dans la feuille de partage native (Android/iOS). */
  shareTitle?: string;
}

/**
 * Service unique de génération/partage du PDF de billet.
 *
 * Remplace la logique précédemment dupliquée dans BookingFormPage et
 * TicketDetailPage, qui ne fonctionnait pas pour plusieurs raisons :
 *
 * 1. html2canvas ne sait pas interpréter les fonctions de couleur CSS
 *    modernes (oklch(), color-mix(), lab()...) que les thèmes
 *    Material/Tailwind actuels utilisent via des variables CSS
 *    (--color-*, bg-primary, text-on-primary, etc.). Sur ce type de thème,
 *    html2canvas lève une exception dès la capture ("Attempting to parse
 *    an unsupported color function"), ce qui explique un échec systématique
 *    (on tombe directement dans le bloc `catch`, d'où "ça ne marche jamais").
 *
 * 2. Aucune des deux pages ne faisait de distinction entre plateforme
 *    native (Android/iOS via Capacitor) et web (navigateur/PWA). Or
 *    `Filesystem.writeFile` + `Share.share` avec une URI de fichier local
 *    ne fonctionnent fiablement que sur natif : sur le web, l'URI renvoyée
 *    par le polyfill Filesystem n'est pas partageable par `navigator.share`,
 *    donc l'appel échoue silencieusement ou lève une erreur.
 *
 * 3. Pour une réservation à plusieurs passagers, `#printArea` contient
 *    PLUSIEURS `.print-ticket`. L'ancien code capturait toute la zone en
 *    UNE seule image qu'il écrasait sur UNE seule page A4 : billets
 *    minuscules, illisibles, voire coupés. On capture maintenant chaque
 *    billet séparément et on ajoute une page PDF par billet.
 */
@Injectable({ providedIn: 'root' })
export class TicketPdfService {
  async exportToPdf(options: TicketExportOptions): Promise<void> {
    const container = document.getElementById(options.containerId);
    if (!container) {
      throw new Error(
        `Zone imprimable introuvable (#${options.containerId}).`,
      );
    }

    const ticketEls = Array.from(
      container.querySelectorAll<HTMLElement>('.print-ticket'),
    );
    const elementsToCapture = ticketEls.length > 0 ? ticketEls : [container];

    // Laisse le temps aux polices (icônes Font Awesome) et au canvas du QR
    // code de finir de se peindre avant la capture. Sans ça, la capture
    // peut partir avant que le rendu soit prêt, surtout juste après un
    // changement de vue.
    await this.waitForRenderReady();

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    for (let i = 0; i < elementsToCapture.length; i++) {
      const el = elementsToCapture[i];

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        onclone: (_doc, clonedEl) =>
          this.flattenComputedColors(el, clonedEl as HTMLElement),
      });

      const imgData = canvas.toDataURL('image/png');
      const availableWidth = pdfWidth - margin * 2;
      const availableHeight = pdfHeight - margin * 2;

      let drawWidth = availableWidth;
      let drawHeight = (canvas.height * drawWidth) / canvas.width;

      // Si le billet est plus haut qu'une page A4, on le réduit pour qu'il
      // tienne entièrement dedans plutôt que de le laisser déborder.
      if (drawHeight > availableHeight) {
        drawHeight = availableHeight;
        drawWidth = (canvas.width * drawHeight) / canvas.height;
      }

      if (i > 0) {
        pdf.addPage();
      }

      const x = margin + (availableWidth - drawWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, margin, drawWidth, drawHeight);
    }

    const fileName = `${options.fileName}.pdf`;

    if (Capacitor.isNativePlatform()) {
      await this.saveAndShareNative(pdf, fileName, options.shareTitle);
    } else {
      // Sur le web (navigateur, PWA), il n'y a pas de "fichier natif" à
      // partager : on déclenche simplement le téléchargement du PDF par le
      // navigateur.
      pdf.save(fileName);
    }
  }

  private async saveAndShareNative(
    pdf: jsPDF,
    fileName: string,
    title?: string,
  ): Promise<void> {
    const base64 = pdf.output('datauristring').split(',')[1];

    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      title: title || fileName,
      url: savedFile.uri,
      dialogTitle: 'Partager ou imprimer votre billet',
    });
  }

  /**
   * Copie, élément par élément, les couleurs déjà résolues par le
   * navigateur (`getComputedStyle` renvoie toujours du rgb()/rgba(), quelle
   * que soit la syntaxe CSS d'origine : oklch, color-mix, variable CSS...)
   * depuis l'élément source vers son clone. C'est ce clone que html2canvas
   * capture réellement (voir option `onclone`), donc il ne voit jamais les
   * fonctions de couleur qu'il ne sait pas interpréter.
   */
  private flattenComputedColors(source: Element, clone: Element): void {
    const props = [
      'color',
      'backgroundColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'boxShadow',
      'fill',
      'stroke',
    ] as const;

    const walk = (srcNode: Element, cloneNode: Element) => {
      const computed = window.getComputedStyle(srcNode);
      const style = (cloneNode as HTMLElement).style;

      props.forEach((prop) => {
        const value = computed.getPropertyValue(
          prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()),
        );
        if (value) {
          style.setProperty(
            prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()),
            value,
          );
        }
      });

      const srcChildren = Array.from(srcNode.children);
      const cloneChildren = Array.from(cloneNode.children);
      srcChildren.forEach((child, idx) => {
        if (cloneChildren[idx]) walk(child, cloneChildren[idx]);
      });
    };

    walk(source, clone);
  }

  private waitForRenderReady(): Promise<void> {
    const fontsReady: Promise<unknown> =
      (document as any).fonts?.ready ?? Promise.resolve();
    return Promise.all([
      fontsReady,
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    ]).then(() => undefined);
  }
}
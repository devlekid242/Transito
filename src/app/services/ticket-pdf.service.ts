import { Injectable } from '@angular/core';
import { domToCanvas } from 'modern-screenshot';
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
 * 1. La capture DOM → image utilisait `html2canvas`, qui réimplémente son
 *    propre mini-moteur CSS en JavaScript plutôt que de s'appuyer sur le
 *    moteur de rendu natif du navigateur. Ce moteur maison ne comprend
 *    QUE la syntaxe couleur historique (rgb(), hsl(), hex, noms) : dès
 *    qu'il rencontre une fonction couleur CSS Color Level 4 (oklch(),
 *    oklab(), lab(), lch(), color-mix()...), il lève une exception et la
 *    capture échoue entièrement ("Attempting to parse an unsupported
 *    color function"). Or Tailwind v4 (utilisé ici) génère justement sa
 *    palette par défaut en oklch — donc TOUTE capture d'une zone stylée
 *    avec ce thème plantait, quelle que soit la propriété en cause
 *    (background, bordure, ombre, dégradé...). html2canvas n'étant plus
 *    activement maintenu, patcher couleur par couleur revient à jouer à
 *    la taupe sans fin. On utilise à la place `modern-screenshot`, qui
 *    sérialise le DOM dans un SVG (`<foreignObject>`) et laisse le
 *    NAVIGATEUR LUI-MÊME le dessiner : n'importe quelle couleur CSS
 *    valide (y compris oklch/color-mix) fonctionne donc nativement, sans
 *    aucun bricolage de conversion de couleurs.
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
 *
 * 4. Le format de page n'est plus un A4 fixe (qui laissait de grandes
 *    marges blanches autour d'un billet bien plus petit). Chaque page du
 *    PDF est désormais dimensionnée exactement à la taille du billet
 *    capturé (+ une petite marge constante), quelle que soit sa hauteur
 *    réelle (billet annulé plus court, points d'embarquement en plus,
 *    etc.).
 */
@Injectable({ providedIn: 'root' })
export class TicketPdfService {
  /** Résolution de capture (plus haut = image plus nette, PDF plus lourd). */
  private readonly captureScale = 2;
  /** Marge autour du billet sur chaque page, en millimètres. */
  private readonly pageMarginMm = 8;
  /** Conversion pixel CSS (96 dpi, standard navigateur) → millimètre. */
  private readonly pxToMm = 25.4 / 96;

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

    let pdf: jsPDF | null = null;

    for (let i = 0; i < elementsToCapture.length; i++) {
      const el = elementsToCapture[i];

      const canvas = await domToCanvas(el, {
        scale: this.captureScale,
        backgroundColor: '#ffffff',
        // Laisse un peu plus de marge que le défaut pour les polices/QR
        // codes avant d'abandonner la capture.
        timeout: 15000,
      });

      // Taille réelle du billet (en CSS px, indépendante de captureScale)
      // convertie en millimètres, pour que la page fasse exactement la
      // taille du contenu plutôt qu'un format papier standard.
      const contentWidthMm = (canvas.width / this.captureScale) * this.pxToMm;
      const contentHeightMm =
        (canvas.height / this.captureScale) * this.pxToMm;
      const pageWidth = contentWidthMm + this.pageMarginMm * 2;
      const pageHeight = contentHeightMm + this.pageMarginMm * 2;
      const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';

      const imgData = canvas.toDataURL('image/png');

      if (!pdf) {
        pdf = new jsPDF({
          orientation,
          unit: 'mm',
          format: [pageWidth, pageHeight],
        });
      } else {
        pdf.addPage([pageWidth, pageHeight], orientation);
      }

      pdf.addImage(
        imgData,
        'PNG',
        this.pageMarginMm,
        this.pageMarginMm,
        contentWidthMm,
        contentHeightMm,
      );
    }

    if (!pdf) {
      throw new Error('Aucun billet à exporter.');
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

  private waitForRenderReady(): Promise<void> {
    const fontsReady: Promise<unknown> =
      (document as any).fonts?.ready ?? Promise.resolve();
    return Promise.all([
      fontsReady,
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    ]).then(() => undefined);
  }
}
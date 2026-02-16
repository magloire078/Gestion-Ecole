
'use client';
import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface MailOptions {
  to: string | string[];
  message: {
    subject: string;
    text?: string;
    html: string;
  };
  template?: {
    name: string;
    data: any;
  };
}

export class MailService {
  constructor(private firestore: Firestore) { }

  /**
   * Envoie un email en ajoutant un document à la collection 'mail'.
   * Nécessite l'extension Firebase "Trigger Email from Firestore" configurée.
   */
  async sendMail(options: MailOptions) {
    try {
      const mailCollection = collection(this.firestore, 'mail');
      await addDoc(mailCollection, {
        ...options,
        delivery: {
          startTime: serverTimestamp(),
          state: 'PENDING'
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error sending mail:', error);
      return { success: false, error };
    }
  }

  /**
   * Email de Bienvenue
   */
  async sendWelcomeEmail(to: string, userName: string, schoolName: string) {
    return this.sendMail({
      to,
      message: {
        subject: `Bienvenue sur GéreEcole - ${schoolName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h1 style="color: #0C365A;">Bienvenue, ${userName} !</h1>
            <p>Nous sommes ravis de vous compter parmi nous. Votre école <strong>${schoolName}</strong> a été créée avec succès sur GéreEcole.</p>
            <p>Vous pouvez dès maintenant commencer à configurer vos classes, ajouter votre personnel et inscrire vos premiers élèves.</p>
            <div style="margin: 20px 0;">
              <a href="https://gereecole.com/dashboard" style="background-color: #2D9CDB; color: white; padding: 10px 20px; text-decoration: none; rounded: 5px; font-weight: bold;">Accéder à mon tableau de bord</a>
            </div>
            <p>Si vous avez besoin d'aide, n'hésitez pas à consulter notre centre d'aide ou à contacter notre support.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8em; color: #777;">L'équipe GéreEcole</p>
          </div>
        `
      }
    });
  }

  /**
   * Email de Relance Onboarding
   */
  async sendOnboardingReminder(to: string, userName: string) {
    return this.sendMail({
      to,
      message: {
        subject: `Terminez l'installation de votre école sur GéreEcole`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0C365A; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">GéreEcole</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #eee;">
              <h2 style="color: #0C365A;">Besoin d'un coup de main, ${userName} ?</h2>
              <p>Nous avons remarqué que l'installation de votre établissement n'est pas encore terminée.</p>
              <p>Terminer la configuration vous permettra de profiter pleinement de toutes les fonctionnalités : gestion des stocks, paie du personnel, et suivi pédagogique.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://gereecole.com/onboarding" style="background-color: #2D9CDB; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Terminer mon installation</a>
              </div>
              <p>C'est gratuit et cela ne prend que quelques minutes.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 0.8em; color: #777; text-align: center;">L'équipe GéreEcole</p>
            </div>
          </div>
        `
      }
    });
  }

  /**
   * Alerte Stock Bas
   */
  async sendLowStockAlert(to: string, itemName: string, currentQuantity: number, threshold: number, schoolName: string) {
    return this.sendMail({
      to,
      message: {
        subject: `⚠️ Alerte Stock Bas : ${itemName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #e11d48; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Alerte Inventaire</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #eee;">
              <h2 style="color: #e11d48;">Stock critique détecté</h2>
              <p>L'article suivant a atteint son seuil d'alerte à <strong>${schoolName}</strong> :</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Article :</strong> ${itemName}</p>
                <p style="margin: 5px 0;"><strong>Quantité actuelle :</strong> <span style="color: #e11d48; font-weight: bold;">${currentQuantity}</span></p>
                <p style="margin: 5px 0;"><strong>Seuil d'alerte :</strong> ${threshold}</p>
              </div>
              <p>Veuillez prévoir un réapprovisionnement pour éviter toute rupture de service.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://gereecole.com/dashboard/stocks" style="background-color: #0C365A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Gérer l'inventaire</a>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 0.8em; color: #777; text-align: center;">Système automatique GéreEcole</p>
            </div>
          </div>
        `
      }
    });
  }

  /**
   * Alerte Absence Élève (Parents)
   */
  async sendAbsenceAlert(to: string, parentName: string, studentName: string, date: string, type: string, schoolName: string) {
    return this.sendMail({
      to,
      message: {
        subject: `Notification d'absence : ${studentName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0C365A; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Note d'Information</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #eee;">
              <p>Bonjour ${parentName},</p>
              <p>Nous vous informons que votre enfant, <strong>${studentName}</strong>, a été marqué(e) absent(e) à <strong>${schoolName}</strong> le :</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Date :</strong> ${date}</p>
                <p style="margin: 5px 0;"><strong>Type d'absence :</strong> ${type}</p>
              </div>
              <p>Si cette absence était prévue, nous vous prions de bien vouloir régulariser le justificatif via l'application ou au secrétariat.</p>
              <p>Dans le cas contraire, merci de contacter immédiatement l'établissement.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://gereecole.com/parent" style="background-color: #2D9CDB; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Justifier l'absence</a>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 0.8em; color: #777; text-align: center;">Administration ${schoolName}</p>
            </div>
          </div>
        `
      }
    });
  }

  /**
   * Rappel de Scolarité (Relance)
   */
  async sendTuitionReminder(to: string, parentName: string, studentName: string, amountDue: number, schoolName: string) {
    return this.sendMail({
      to,
      message: {
        subject: `Rappel de paiement scolarité : ${studentName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0C365A; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Rappel de Scolarité</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #eee;">
              <p>Bonjour ${parentName},</p>
              <p>Sauf erreur de notre part, nous n'avons pas encore reçu la régularisation totale des frais de scolarité de <strong>${studentName}</strong> à <strong>${schoolName}</strong>.</p>
              <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0; color: #9a3412;"><strong>Solde restant dû :</strong> <span style="font-size: 1.2em; font-weight: bold;">${amountDue.toLocaleString()} CFA</span></p>
              </div>
              <p>Nous vous prions de bien vouloir procéder au règlement dans les meilleurs délais afin de garantir la continuité du suivi pédagogique de votre enfant.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://gereecole.com/dashboard/paiements" style="background-color: #0C365A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Régulariser maintenant</a>
              </div>
              <p>Si un paiement a été effectué récemment, merci de ne pas tenir compte de ce message et de nous transmettre le justificatif.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 0.8em; color: #777; text-align: center;">Service Comptabilité - ${schoolName}</p>
            </div>
          </div>
        `
      }
    });
  }

  /**
   * Reçu de Paiement (Comptabilité)
   */
  async sendTuitionPaymentReceipt(to: string, parentName: string, studentName: string, amount: number, reference: string, schoolName: string) {
    return this.sendMail({
      to,
      message: {
        subject: `Reçu de paiement - ${studentName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #22c55e; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Confirmation de Paiement</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #eee;">
              <p>Bonjour ${parentName},</p>
              <p>Nous confirmons la réception de votre paiement concernant les frais de scolarité de <strong>${studentName}</strong>.</p>
              <div style="border: 1px solid #eee; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Référence :</strong> ${reference}</p>
                <p style="margin: 5px 0;"><strong>Montant :</strong> ${amount.toLocaleString()} CFA</p>
                <p style="margin: 5px 0;"><strong>Date :</strong> ${new Date().toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Établissement :</strong> ${schoolName}</p>
              </div>
              <p>Merci de votre confiance.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://gereecole.com/dashboard/comptabilite" style="background-color: #0C365A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Voir mon historique</a>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 0.8em; color: #777; text-align: center;">Service Comptabilité - GéreEcole</p>
            </div>
          </div>
        `
      }
    });
  }

  /**
   * Confirmation d'Inscription à une Compétition
   */
  async sendCompetitionRegistrationEmail(to: string, studentName: string, competitionName: string, schoolName: string) {
    return this.sendMail({
      to,
      message: {
        subject: `Inscription confirmée : ${competitionName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0C365A; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Compétition & Activités</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #eee;">
              <p>Bonjour,</p>
              <p>Nous avons le plaisir de vous confirmer l'inscription de <strong>${studentName}</strong> à la compétition : <strong>${competitionName}</strong>.</p>
              <div style="background-color: #f0f7ff; border-left: 4px solid #2D9CDB; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #0C365A;"><strong>Établissement :</strong> ${schoolName}</p>
                <p style="margin: 5px 0 0 0; color: #0C365A;"><strong>Activité :</strong> ${competitionName}</p>
              </div>
              <p>Nous lui souhaitons beaucoup de succès dans cette épreuve !</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://gereecole.com/dashboard/activites" style="background-color: #0C365A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Détails de l'activité</a>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 0.8em; color: #777; text-align: center;">Service Pédagogique - ${schoolName}</p>
            </div>
          </div>
        `
      }
    });
  }

  /**
   * Publication des Résultats de Compétition
   */
  async sendCompetitionResultEmail(to: string, studentName: string, competitionName: string, rank: string, schoolName: string) {
    const isWinner = rank.includes('1') || rank.includes('2') || rank.includes('3');
    return this.sendMail({
      to,
      message: {
        subject: `Résultats de la compétition : ${competitionName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${isWinner ? '#f59e0b' : '#0C365A'}; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🏆 Résultats de Compétition</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #eee;">
              <p>Bonjour,</p>
              <p>Les résultats de la compétition <strong>${competitionName}</strong> ont été publiés.</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; text-transform: uppercase; font-size: 0.8em; font-weight: bold; letter-spacing: 0.1em;">Élève</p>
                <p style="margin: 5px 0 15px 0; font-size: 1.2em; font-weight: bold; color: #0C365A;">${studentName}</p>
                <p style="margin: 0; color: #64748b; text-transform: uppercase; font-size: 0.8em; font-weight: bold; letter-spacing: 0.1em;">Classement / Résultat</p>
                <p style="margin: 5px 0 0 0; font-size: 2em; font-weight: bold; color: ${isWinner ? '#f59e0b' : '#0C365A'};">${rank}</p>
              </div>
              ${isWinner ? '<p style="text-align: center; font-weight: bold; color: #f59e0b;">Félicitations pour cette excellente performance ! 🎊</p>' : ''}
              <p>L'ensemble de l'équipe pédagogique félicite tous les participants pour leurs efforts.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://gereecole.com/dashboard/activites" style="background-color: #0C365A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Voir tous les résultats</a>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 0.8em; color: #777; text-align: center;">Direction ${schoolName}</p>
            </div>
          </div>
        `
      }
    });
  }
}

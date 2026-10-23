import fs from 'node:fs';
import { computeStats } from './domain/statsCalculator.js';

export class ReportService {
  constructor({ statsCalculator = computeStats } = {}) {
    // Injection par le constructeur avec valeur par défaut
    this.statsCalculator = statsCalculator;

    this.dbFile = new URL('./orders.json', import.meta.url);
    this.smtp = { host: 'smtp.shoplite.fr', port: 587, user: 'reports', password: 'ShopLite!' };
    this.outbox = [];
    this.history = [];
  }

  loadOrders() {
    const raw = fs.readFileSync(this.dbFile, 'utf8');
    return JSON.parse(raw);
  }

  generate(month, format, recipient) {
    // 1 & 2. Lecture et calcul via le composant extrait
    const rawOrders = this.loadOrders();
    const stats = this.statsCalculator(rawOrders, month);

    const { count, revenueHT, vat, revenueTTC, average, byCategory } = stats;

    // 3. Mise en forme
    let output;
    if (format === 'csv') {
      output = 'categorie; montant_ht\n';
      for (const c of Object.keys(byCategory).sort()) {
        output += `${c};${byCategory[c]}\n`;
      }
      output += `TOTAL HT;${revenueHT}\nTVA;${vat}\nTOTAL TTC;${revenueTTC}\n`;
    } else if (format === 'html') {
      output = `<h1>Ventes ${month}</h1><p>${count} commande(s), panier moyen ${average} €</p><ul>`;
      for (const c of Object.keys(byCategory).sort()) {
        output += `<li>${c}: ${byCategory[c]} €</li>`;
      }
      output += `</ul><p><b>Total TTC: ${revenueTTC} €</b></p>`;
    } else if (format === 'json') {
      output = JSON.stringify({ month, count, revenueHT, vat, revenueTTC, average, byCategory });
    } else {
      throw new Error(`Format non supporté: ${format}`);
    }

    // 4. Journalisation
    const line = `[${new Date().toISOString()}] rapport ${month} (${format}): ${count} commande(s)`;
    console.log(line);
    this.history.push(line);

    // 5. Envoi par e-mail
    if (recipient) {
      if (!recipient.includes('@')) throw new Error(`Adresse invalide: ${recipient}`);
      this.outbox.push({
        via: `${this.smtp.host}:${this.smtp.port}`,
        to: recipient,
        subject: `Rapport des ventes ${month}`,
        body: output,
      });
    }

    return output;
  }
}

export class FreeReportService extends ReportService {
  generate(month, format, recipient) {
    if (format !== 'csv') throw new Error('Format réservé aux comptes Pro');
    if (recipient) throw new Error('Envoi par e-mail réservé aux comptes Pro');
    return super.generate(month, format);
  }
}
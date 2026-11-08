import { allergens, paymentMethods, shop } from '../config.js';
import { formatLei } from '../../public/js/shared/format.js';
import { renderProductSvg } from '../../public/js/shared/illustrations.js';
import { html, raw } from '../lib/html.js';
import { hoursSummary } from '../lib/schedule.js';
import { pageHero } from './components.js';
import { icon } from './icons.js';
import { layout } from './layout.js';

const home = { href: '/', label: 'Acasă' };

function infoPage(ctx, { title, lead, nav = '', description, content, slug }) {
  return layout(ctx, {
    title,
    description: description || lead,
    nav,
    canonical: `/${slug}`,
    body: html`${pageHero({ title, lead, crumbs: [home, { label: title }] })}
<section class="section">
  <div class="container narrow prose prose-page">${content}</div>
</section>`,
  });
}

export function aboutPage(ctx) {
  const art = renderProductSvg({ kind: 'cake', bg: '#FCE8EC', side: '#FFF4EE', drip: '#7B2D4F', topping: 'berries', bottomBorder: '#FFFFFF' }, { seed: 'despre' });
  return layout(ctx, {
    title: 'Despre noi',
    description: `Povestea ${shop.fullName}: dulciuri artizanale, preparate zilnic, cu ingrediente adevărate.`,
    nav: 'despre',
    canonical: '/despre-noi',
    body: html`${pageHero({ title: 'Despre noi', lead: 'O cofetărie mică, cu rețete mari.', crumbs: [home, { label: 'Despre noi' }] })}
<section class="section">
  <div class="container about-grid">
    <div class="prose">
      <p>La ${shop.fullName} credem că un desert bun începe cu ingrediente bune și cu răbdare. De aceea preparăm totul în laboratorul nostru, în fiecare zi, în cantități mici: blaturile se coc dimineața, cremele se fac proaspete, iar fructele le alegem de la furnizori în care avem încredere.</p>
      <p>Ne plac rețetele clasice ale cofetăriilor românești — savarina, amandina, cremșnitul, tortul Diplomat — și le pregătim așa cum le știm din copilărie. Alături de ele găsești deserturi noi, de sezon, și torturi personalizate, gândite împreună cu tine pentru momentele importante.</p>
      <h2>Ce ne ghidează</h2>
      <ul class="check-list">
        <li>${icon('check', { size: 18 })} Unt, smântână și ouă adevărate în rețetele clasice.</li>
        <li>${icon('check', { size: 18 })} Arome naturale: vanilie, coajă de citrice, cacao de calitate.</li>
        <li>${icon('check', { size: 18 })} Opțiuni de post și fără gluten, marcate clar.</li>
        <li>${icon('check', { size: 18 })} Informații complete despre ingrediente și alergeni la fiecare produs.</li>
      </ul>
      <p>Te așteptăm în cofetărie la o cafea și o prăjitură sau, dacă ești pe fugă, comandă online și îți pregătim totul pentru ora aleasă.</p>
      <p class="cluster"><a class="btn btn-primary" href="/produse">Vezi produsele</a><a class="btn btn-outline" href="/contact">Contact</a></p>
    </div>
    <div class="about-art">${raw(art)}</div>
  </div>
</section>`,
  });
}

export function contactPage(ctx) {
  return layout(ctx, {
    title: 'Contact',
    description: `Adresa, telefonul, emailul și programul ${shop.fullName}.`,
    nav: 'contact',
    canonical: '/contact',
    body: html`${pageHero({ title: 'Contact', lead: 'Suntem aici pentru comenzi, întrebări și torturi speciale.', crumbs: [home, { label: 'Contact' }] })}
<section class="section">
  <div class="container contact-grid">
    <div class="card">
      <h2 class="card-title">${icon('pin', { size: 20 })} Cofetăria</h2>
      <p>${shop.address.street}<br>${shop.address.region}, ${shop.address.locality} ${shop.address.postalCode}</p>
      ${shop.mapUrl ? html`<p><a class="link-arrow" href="${shop.mapUrl}" target="_blank" rel="noopener">Deschide harta ${icon('arrowRight', { size: 16 })}</a></p>` : ''}
    </div>
    <div class="card">
      <h2 class="card-title">${icon('phone', { size: 20 })} Telefon și email</h2>
      <p><a href="tel:${shop.phoneHref}"><strong>${shop.phone}</strong></a><br><a href="mailto:${shop.email}">${shop.email}</a></p>
      <p class="small muted">Pentru torturile de nuntă și evenimente, te rugăm să ne contactezi cu cel puțin două săptămâni înainte.</p>
    </div>
    <div class="card">
      <h2 class="card-title">${icon('clock', { size: 20 })} Program</h2>
      <dl class="hours hours-large">${hoursSummary().map((h) => html`<div><dt>${h.days}</dt><dd>${h.hours}</dd></div>`)}</dl>
    </div>
    <div class="card">
      <h2 class="card-title">${icon('store', { size: 20 })} Date de identificare</h2>
      <p class="small">${shop.company.name}<br>CUI: ${shop.company.cui}<br>Nr. Reg. Com.: ${shop.company.regCom}<br>${shop.address.street}, ${shop.address.locality}</p>
    </div>
  </div>
</section>`,
  });
}

export function deliveryPage(ctx) {
  const { settings } = ctx;
  return infoPage(ctx, {
    title: 'Livrare și plată',
    slug: 'livrare-si-plata',
    nav: 'livrare',
    lead: 'Tot ce trebuie să știi despre ridicare, livrare și plată.',
    content: html`
<h2>Ridicare din cofetărie</h2>
<p>Ridicarea este gratuită. Alegi ziua și intervalul orar la finalizarea comenzii, iar noi pregătim totul pentru ora aleasă la ${shop.address.street}, ${shop.address.locality}.</p>
<h2>Livrare la domiciliu</h2>
${settings.deliveryEnabled
  ? html`<p>${shop.deliveryArea}</p>
<ul>
  <li>Taxa de livrare: <strong>${formatLei(settings.deliveryFee)}</strong>.</li>
  <li>Livrare <strong>gratuită</strong> pentru comenzile de peste <strong>${formatLei(settings.freeDeliveryOver)}</strong>.</li>
  <li>Valoarea minimă a unei comenzi cu livrare: <strong>${formatLei(settings.minOrderDelivery)}</strong>.</li>
  <li>Livrăm în intervale de câte două ore, începând cu ora 10:00.</li>
</ul>
<p>Torturile călătoresc în cutii rigide, în mașini cu temperatură controlată, ca să ajungă la tine exact cum au plecat din laborator.</p>`
  : html`<p>Momentan nu facem livrări. Comenzile pot fi ridicate din cofetărie.</p>`}
<h2>Cu cât timp înainte comand?</h2>
<ul>
  <li><strong>Prăjituri, deserturi la pahar și fursecuri:</strong> cu aproximativ 2 ore înainte, în limita programului.</li>
  <li><strong>Torturi din meniu și cozonaci:</strong> cu minimum 24 de ore înainte.</li>
  <li><strong>Platouri cu mini-prăjituri:</strong> cu minimum 48 de ore înainte.</li>
  <li><strong>Torturi personalizate:</strong> cu minimum 3 zile înainte (5 zile pentru torturile pe trei etaje).</li>
</ul>
<p>La finalizarea comenzii îți arătăm automat doar zilele și intervalele disponibile pentru produsele din coș.</p>
<h2>Plata</h2>
<ul>${paymentMethods.map((m) => html`<li><strong>${m.label}:</strong> ${m.description}</li>`)}</ul>
<p>Pentru transferul bancar: ${shop.company.name}, IBAN <span class="mono">${shop.company.iban}</span>, ${shop.company.bank}. Te rugăm să menționezi numărul comenzii.</p>
<h2>Anulare și modificări</h2>
<p>Poți modifica sau anula o comandă fără costuri cu cel puțin 24 de ore înainte de ora programată (48 de ore pentru torturile personalizate), sunându-ne la <a href="tel:${shop.phoneHref}">${shop.phone}</a>. Detalii complete găsești în <a href="/termeni-si-conditii">Termeni și condiții</a>.</p>`,
  });
}

export function faqPage(ctx) {
  const { settings } = ctx;
  const faqs = [
    ['Cât de repede pot primi o comandă?', 'Prăjiturile și deserturile la pahar pot fi gata în aproximativ două ore, în timpul programului. Torturile din meniu se comandă cu minimum 24 de ore înainte, iar cele personalizate cu minimum 3 zile înainte.'],
    ['Pot comanda pentru o anumită oră?', 'Da. La finalizarea comenzii alegi ziua și intervalul orar: o oră pentru ridicare sau două ore pentru livrare.'],
    ['Aveți produse de post sau fără gluten?', html`Da. Le găsești ușor în catalog cu filtrele <a href="/produse?eticheta=post">„De post”</a> și <a href="/produse?eticheta=fara-gluten">„Fără gluten”</a>. Atenție: toate produsele sunt preparate în același laborator și pot conține urme de alergeni.`],
    ['Unde găsesc informații despre alergeni?', html`Fiecare produs are lista de ingrediente și alergeni pe pagina lui. Alergenii pe care îi declarăm: ${Object.values(allergens).join(', ').toLowerCase()}.`],
    ['Cât costă livrarea?', settings.deliveryEnabled ? `Livrarea costă ${formatLei(settings.deliveryFee)} și este gratuită pentru comenzile de peste ${formatLei(settings.freeDeliveryOver)}.` : 'Momentan nu facem livrări, dar poți ridica oricând comanda din cofetărie.'],
    ['Cum aflu în ce stadiu e comanda mea?', html`Primești pe email un link personal către pagina comenzii. Îl poți găsi oricând și din <a href="/urmareste-comanda">Urmărește comanda</a>, cu numărul comenzii și telefonul.`],
    ['Pot trimite o poză pentru tort?', 'Da. Alege opțiunea „Imagine comestibilă” în configuratorul de tort, apoi trimite-ne fotografia pe email, răspunzând la mesajul de confirmare a comenzii.'],
    ['Emiteți factură pe firmă?', 'Da. Scrie datele firmei în câmpul „Observații” la finalizarea comenzii sau trimite-ni-le pe email.'],
  ];
  const content = html`<div class="faq">${faqs.map(([q, a]) => html`<details class="faq-item"><summary>${q}</summary><div class="prose"><p>${a}</p></div></details>`)}</div>
  <p>Nu ai găsit răspunsul? Sună-ne la <a href="tel:${shop.phoneHref}">${shop.phone}</a> sau scrie-ne la <a href="mailto:${shop.email}">${shop.email}</a>.</p>`;
  return layout(ctx, {
    title: 'Întrebări frecvente',
    description: 'Răspunsuri despre comenzi, livrare, alergeni, produse de post și torturi personalizate.',
    canonical: '/intrebari-frecvente',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: String(a).replace(/<[^>]+>/g, '') } })),
    },
    body: html`${pageHero({ title: 'Întrebări frecvente', crumbs: [home, { label: 'Întrebări frecvente' }] })}
<section class="section"><div class="container narrow">${content}</div></section>`,
  });
}

export function termsPage(ctx) {
  const c = shop.company;
  return infoPage(ctx, {
    title: 'Termeni și condiții',
    slug: 'termeni-si-conditii',
    lead: 'Condițiile în care poți comanda produse de pe acest site.',
    content: html`
<p class="notice-inline">${icon('info', { size: 18 })} Acest text este un model. Adaptează-l afacerii tale și verifică-l cu un specialist înainte de publicare.</p>
<h2>1. Cine suntem</h2>
<p>Site-ul este administrat de ${c.name}, CUI ${c.cui}, Nr. Reg. Com. ${c.regCom}, cu sediul în ${shop.address.street}, ${shop.address.locality} („${shop.fullName}”). Ne poți contacta la ${shop.phone} sau ${shop.email}.</p>
<h2>2. Comenzi</h2>
<p>Comanda transmisă prin site reprezintă o ofertă de cumpărare. Contractul se încheie în momentul în care confirmăm comanda telefonic sau prin email. Ne rezervăm dreptul de a refuza comenzile pe care nu le putem onora, caz în care te anunțăm cât mai repede.</p>
<h2>3. Prețuri și plată</h2>
<p>Prețurile sunt exprimate în lei și includ TVA. Taxa de livrare, dacă este cazul, este afișată separat înainte de trimiterea comenzii. Plata se face numerar sau cu cardul la primirea produselor, ori prin transfer bancar.</p>
<h2>4. Ridicare și livrare</h2>
<p>Produsele se ridică din cofetărie sau se livrează la adresa indicată, în ziua și intervalul orar alese. Te rugăm să fii disponibil în intervalul ales; produsele perisabile nu pot fi păstrate peste termenul recomandat.</p>
<h2>5. Dreptul de retragere</h2>
<p>Conform art. 16 din OUG nr. 34/2014, dreptul de retragere nu se aplică produselor care se pot deteriora sau expira rapid (precum prăjiturile și torturile) și nici produselor realizate după specificațiile clientului (precum torturile personalizate).</p>
<h2>6. Modificarea și anularea comenzii</h2>
<p>Poți modifica sau anula gratuit o comandă cu cel puțin 24 de ore înainte de ora programată (48 de ore pentru torturile personalizate). După acest termen, dacă am început deja prepararea, putem reține contravaloarea ingredientelor și a manoperei.</p>
<h2>7. Alergeni și păstrare</h2>
<p>Informațiile despre ingrediente și alergeni sunt afișate pe pagina fiecărui produs. Toate produsele sunt preparate în același laborator și pot conține urme de alergeni. Respectă condițiile de păstrare indicate.</p>
<h2>8. Reclamații și litigii</h2>
<p>Pentru orice nemulțumire, contactează-ne la ${shop.email}; răspundem în cel mult 15 zile. Poți apela și la Autoritatea Națională pentru Protecția Consumatorilor (<a href="https://anpc.ro/" target="_blank" rel="noopener">anpc.ro</a>) și la procedura de soluționare alternativă a litigiilor (<a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener">SAL</a>).</p>`,
  });
}

export function privacyPage(ctx) {
  const c = shop.company;
  return infoPage(ctx, {
    title: 'Politica de confidențialitate',
    slug: 'politica-de-confidentialitate',
    lead: 'Cum folosim și cum protejăm datele tale personale.',
    content: html`
<p class="notice-inline">${icon('info', { size: 18 })} Acest text este un model. Adaptează-l afacerii tale și verifică-l cu un specialist înainte de publicare.</p>
<h2>Operatorul datelor</h2>
<p>${c.name}, CUI ${c.cui}, ${shop.address.street}, ${shop.address.locality}. Contact pentru protecția datelor: ${shop.email}.</p>
<h2>Ce date colectăm</h2>
<p>Când plasezi o comandă: numele, telefonul, adresa de email, adresa de livrare (dacă alegi livrarea), detaliile comenzii și observațiile pe care ni le transmiți.</p>
<h2>De ce le folosim</h2>
<ul>
  <li>pentru a prelua, confirma, pregăti și livra comanda (executarea contractului, art. 6 alin. (1) lit. b) din GDPR);</li>
  <li>pentru a-ți trimite emailuri despre stadiul comenzii;</li>
  <li>pentru obligațiile legale contabile și fiscale (art. 6 alin. (1) lit. c) din GDPR).</li>
</ul>
<p>Nu folosim datele tale pentru marketing fără acordul tău și nu le vindem nimănui.</p>
<h2>Cât timp le păstrăm</h2>
<p>Pe durata necesară îndeplinirii comenzii și apoi atât cât ne obligă legea (de regulă, documentele contabile se păstrează 5 ani).</p>
<h2>Cookie-uri și stocare locală</h2>
<p>Site-ul nu folosește cookie-uri de urmărire sau de publicitate și nu încarcă resurse de la terți. Coșul de cumpărături este păstrat doar în browserul tău (stocare locală), iar dacă bifezi „Ține minte datele mele”, datele de contact sunt salvate tot doar pe dispozitivul tău.</p>
<h2>Drepturile tale</h2>
<p>Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție. Ne poți scrie oricând la ${shop.email}. Ai, de asemenea, dreptul să depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (<a href="https://www.dataprotection.ro/" target="_blank" rel="noopener">dataprotection.ro</a>).</p>`,
  });
}

// Produits : plus d'ajout de photo ; icône générique selon le type de produit.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).pop();
const grab = (re) => { const m = re.exec(app); assert.ok(m, 'introuvable : ' + re); return m[0]; };

describe('Produits : icônes génériques', () => {
  const ctx = vm.createContext({});
  vm.runInContext([grab(/var PRD_KINDS=\{[\s\S]*?\n\};/), grab(/function prodKind\(p\)\{[\s\S]*?\n\}/), grab(/function prodKindBox\(p,cls\)\{[\s\S]*?\n\}/)].join('\n'), ctx);
  const kind = (p) => vm.runInContext(`prodKind(${JSON.stringify(p)})`, ctx);

  it('téléphone par défaut ; tablette, montre, audio, accessoire reconnus par le nom', () => {
    assert.equal(kind({ marque: 'Samsung', modele: 'Galaxy A15' }), 'phone');
    assert.equal(kind({ marque: 'Apple', modele: 'iPhone 13' }), 'phone');
    assert.equal(kind({ marque: 'Tecno', modele: 'Spark 20 Pro' }), 'phone');
    assert.equal(kind({ marque: 'Apple', modele: 'iPad 10' }), 'tablette');
    assert.equal(kind({ marque: 'Samsung', modele: 'Galaxy Tab A9' }), 'tablette');
    assert.equal(kind({ marque: 'Apple', modele: 'Watch SE' }), 'montre');
    assert.equal(kind({ marque: 'Samsung', modele: 'Galaxy Buds FE' }), 'audio');
    assert.equal(kind({ nom: 'Écouteurs Bluetooth' }), 'audio');
    assert.equal(kind({ nom: 'Chargeur rapide 25W' }), 'accessoire');
    assert.equal(kind({ nom: 'Coque iPhone 13' }), 'accessoire');
    assert.equal(kind({}), 'phone');
  });

  it('jamais d\'image : seulement une icône, avec un libellé clair', () => {
    const h = vm.runInContext("prodKindBox({modele:'Galaxy A15',photo:'data:image/jpeg;base64,AAAA'},'dsk-thumb')", ctx);
    assert.doesNotMatch(h, /background-image|data:image/);
    assert.match(h, /aria-label="Téléphone \(icône générique\)"/);
  });

  it('le formulaire produit ne propose plus de photo', () => {
    assert.doesNotMatch(app, /prPhotoSection|prPhotoPick|PRD_PHOTO|pr-photo-inp/);
  });
});

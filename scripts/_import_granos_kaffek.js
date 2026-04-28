#!/usr/bin/env node
/**
 * _import_granos_kaffek.js – April 2026
 * Import ALL café en grano from kaffek.es (111 products, 3 pages)
 * Brands: Lavazza, Kimbo, illy, Segafredo, Melitta, DeLonghi, Kaffekapslen,
 *         Mövenpick, Zoégas, Costa, L'OR, Starbucks, Café Royal, Black Coffee Roasters,
 *         Domus Barista, Garibaldi, Gimoka, Gevalia
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (admin.apps.length === 0)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

const ALL = [
  // ═══ Lavazza (13) ═══
  {
    slug: 'crema-e-aroma-1000-g-granos-de-cafe-lavazza',
    nombre: 'Lavazza Crema E Aroma 1000 g Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 22.19,
  },
  {
    slug: 'qualita-rossa-1000-g-granos-de-cafe-lavazza',
    nombre: 'Lavazza Qualità Rossa 1000 g Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 23.99,
  },
  {
    slug: 'crema-e-gusto-forte-lavazza-granos-de-cafe',
    nombre: 'Lavazza Crema e Gusto Forte 1 kg Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 18.39,
  },
  {
    slug: 'espresso-intenso-lavazza-granos-de-cafe',
    nombre: 'Lavazza Espresso Barista Intenso 1 kg Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 23.39,
  },
  {
    slug: 'caffe-crema-dolce-1000-g-granos-de-cafe-lavazza',
    nombre: 'Lavazza Caffè Crema Dolce 1000 g Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 21.09,
  },
  {
    slug: 'espresso-gran-crema-granos-de-cafe-lavazza',
    nombre: 'Lavazza Espresso Barista Gran Crema 1000 g Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 25.49,
  },
  {
    slug: 'caffe-crema-gustoso-1000-g-granos-de-cafe-lavazza',
    nombre: 'Lavazza Caffè Crema Gustoso 1000 g Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 20.99,
  },
  {
    slug: 'qualita-oro-1000-g-granos-de-cafe-lavazza',
    nombre: 'Lavazza Qualità Oro 1000 g Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 28.69,
  },
  {
    slug: 'espresso-barista-perfetto-1000-g-granos-de-cafe-lavazza',
    nombre: 'Lavazza Espresso Barista Perfetto 1000 g Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 26.49,
  },
  {
    slug: 'caffe-crema-classico-1000-g-granos-de-cafe-lavazza',
    nombre: 'Lavazza Caffé Crema Classico 1000 g Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 20.79,
  },
  {
    slug: 'espresso-italiano-classico-lavazza-whole-beans',
    nombre: 'Lavazza Espresso Italiano Classico 1000 g Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 24.39,
  },
  {
    slug: 'crema-e-gusto-classico-lavazza-granos-de-cafe',
    nombre: 'Lavazza Crema e Gusto Classico 1 kg Granos de café',
    marca: 'Lavazza',
    peso: '1000 g',
    precio: 20.19,
  },
  {
    slug: 'decaf-classico-granos-de-cafe-lavazza',
    nombre: 'Lavazza Decaf Classico 500 g Granos de café',
    marca: 'Lavazza',
    peso: '500 g',
    precio: 11.99,
    descafeinado: true,
  },

  // ═══ Kimbo (11) ═══
  {
    slug: 'aroma-gold-kimbo-granos-de-cafe',
    nombre: 'Kimbo Aroma Gold 1 kg Granos de café',
    marca: 'Kimbo',
    peso: '1000 g',
    precio: 25.69,
  },
  {
    slug: 'espresso-classico-kimbo-granos-de-cafe',
    nombre: 'Kimbo Espresso Classico 1 kg Granos de café',
    marca: 'Kimbo',
    peso: '1000 g',
    precio: 19.89,
  },
  {
    slug: 'amalfi-kimbo-1kg-granos-de-cafe',
    nombre: 'Kimbo Amalfi 1 kg Granos de café',
    marca: 'Kimbo',
    peso: '1000 g',
    precio: 22.09,
  },
  {
    slug: 'intenso-kimbo-granos-de-cafe',
    nombre: 'Kimbo Intenso 1 kg Granos de café',
    marca: 'Kimbo',
    peso: '1000 g',
    precio: 19.69,
  },
  {
    slug: 'espresso-napoli-kimbo-granos-de-cafe',
    nombre: 'Kimbo Espresso Napoli 1 kg Granos de café',
    marca: 'Kimbo',
    peso: '1000 g',
    precio: 23.09,
  },
  {
    slug: 'crema-classico-kimbo-granos-de-cafe',
    nombre: 'Kimbo Crema Classico 1 kg Granos de café',
    marca: 'Kimbo',
    peso: '1000 g',
    precio: 21.99,
  },
  {
    slug: 'espresso-barista-arabica-kimbo-granos-de-cafe',
    nombre: 'Kimbo Espresso Barista 100% Arabica 1 kg Granos de café',
    marca: 'Kimbo',
    peso: '1000 g',
    precio: 26.69,
  },
  {
    slug: 'espresso-crema-intensa-kimbo-granos-de-cafe',
    nombre: 'Kimbo Espresso Crema Intensa 1 kg Granos de café',
    marca: 'Kimbo',
    peso: '1000 g',
    precio: 22.99,
  },
  {
    slug: 'antica-miscela-kimbo-granos-de-cafe-500',
    nombre: 'Kimbo Antica Miscela 500 g Granos de café',
    marca: 'Kimbo',
    peso: '500 g',
    precio: 14.19,
  },
  {
    slug: 'descafeinado-kimbo-500g-granos-de-cafe',
    nombre: 'Kimbo Descafeinado 500 g Granos de café',
    marca: 'Kimbo',
    peso: '500 g',
    precio: 16.29,
    descafeinado: true,
  },
  {
    slug: 'capri-kimbo-1kg-granos-de-cafe',
    nombre: 'Kimbo Capri 1 kg Granos de café',
    marca: 'Kimbo',
    peso: '1000 g',
    precio: 21.09,
  },

  // ═══ illy (9) ═══
  {
    slug: 'classico-granos-de-cafe-250-g-illy',
    nombre: 'illy Classico 250 g Granos de café',
    marca: 'illy',
    peso: '250 g',
    precio: 7.29,
  },
  {
    slug: 'illy-beans-india-250-gr',
    nombre: 'illy India 250 g Granos de café',
    marca: 'illy',
    peso: '250 g',
    precio: 7.29,
    origen: 'India',
  },
  {
    slug: 'cafe-en-granos-brasil-illy',
    nombre: 'illy Brasil 250 g Granos de café',
    marca: 'illy',
    peso: '250 g',
    precio: 8.09,
    origen: 'Brasil',
  },
  {
    slug: 'colombia-250-g-illy-granos-de-cafe',
    nombre: 'illy Colombia 250 g Granos de café',
    marca: 'illy',
    peso: '250 g',
    precio: 6.99,
    origen: 'Colombia',
  },
  {
    slug: 'nicaragua-illy-granos-de-cafe',
    nombre: 'illy Nicaragua 250 g Granos de café',
    marca: 'illy',
    peso: '250 g',
    precio: 7.49,
    origen: 'Nicaragua',
  },
  {
    slug: 'guatemala-granos-de-cafe-250-g-illy',
    nombre: 'illy Guatemala 250 g Granos de café',
    marca: 'illy',
    peso: '250 g',
    precio: 6.29,
    origen: 'Guatemala',
  },
  {
    slug: 'intenso-granos-de-cafe-250-g-illy',
    nombre: 'illy Intenso 250 g Granos de café',
    marca: 'illy',
    peso: '250 g',
    precio: 6.39,
  },
  {
    slug: 'descafeinado-250-g-illy-granos-de-cafe',
    nombre: 'illy Descafeinado 250 g Granos de café',
    marca: 'illy',
    peso: '250 g',
    precio: 6.79,
    descafeinado: true,
  },
  {
    slug: 'ethiopia-granos-de-cafe-250-g-illy',
    nombre: 'illy Ethiopia 250 g Granos de café',
    marca: 'illy',
    peso: '250 g',
    precio: 7.99,
    origen: 'Etiopía',
  },

  // ═══ Segafredo (8) ═══
  {
    slug: 'espresso-casa-segafredo-granos-de-cafe',
    nombre: 'Segafredo Espresso Casa 1000 g Granos de café',
    marca: 'Segafredo',
    peso: '1000 g',
    precio: 16.49,
  },
  {
    slug: 'caffe-crema-gustoso-segafredo-granos-de-cafe',
    nombre: 'Segafredo Caffé Crema Gustoso 1000 g Granos de café',
    marca: 'Segafredo',
    peso: '1000 g',
    precio: 16.89,
  },
  {
    slug: 'intermezzo-segafredo-granos-de-cafe',
    nombre: 'Segafredo Intermezzo 1000 g Granos de café',
    marca: 'Segafredo',
    peso: '1000 g',
    precio: 15.29,
  },
  {
    slug: 'selezione-crema-segafredo-granos-de-cafe',
    nombre: 'Segafredo Selezione Crema 1000 g Granos de café',
    marca: 'Segafredo',
    peso: '1000 g',
    precio: 18.69,
  },
  {
    slug: 'selezione-espresso-segafredo-granos-de-cafe',
    nombre: 'Segafredo Selezione Espresso 1000 g Granos de café',
    marca: 'Segafredo',
    peso: '1000 g',
    precio: 19.09,
  },
  {
    slug: 'caffe-crema-classico-segafredo-granos-de-cafe',
    nombre: 'Segafredo Caffé Crema Classico 1000 g Granos de café',
    marca: 'Segafredo',
    peso: '1000 g',
    precio: 18.79,
  },
  {
    slug: 'caffe-crema-dolce-segafredo-granos-de-cafe',
    nombre: 'Segafredo Caffé Crema Dolce 1000 g Granos de café',
    marca: 'Segafredo',
    peso: '1000 g',
    precio: 17.19,
  },
  // 8th missing from pages — skip

  // ═══ DeLonghi (8) ═══
  {
    slug: 'classico-espresso-1000-g-granos-de-cafe-delonghi',
    nombre: 'DeLonghi Classico Espresso 1000 g Granos de café',
    marca: "De'Longhi",
    peso: '1000 g',
    precio: 22.09,
  },
  {
    slug: 'caffe-crema-1000-g-granos-de-cafe-delonghi',
    nombre: 'DeLonghi Caffé Crema 1000 g Granos de café',
    marca: "De'Longhi",
    peso: '1000 g',
    precio: 20.99,
  },
  {
    slug: 'decaffeinato-espresso-250-g-granos-de-cafe-delonghi',
    nombre: 'DeLonghi Decaffeinato Espresso 250 g Granos de café',
    marca: "De'Longhi",
    peso: '250 g',
    precio: 6.19,
    descafeinado: true,
  },
  {
    slug: 'caffe-crema-250-g-granos-de-cafe-delonghi',
    nombre: 'DeLonghi Caffé Crema 250 g Granos de café',
    marca: "De'Longhi",
    peso: '250 g',
    precio: 4.99,
  },
  {
    slug: 'selezione-espresso-1000-g-granos-de-cafe-delonghi',
    nombre: 'DeLonghi Selezione Espresso 1000 g Granos de café',
    marca: "De'Longhi",
    peso: '1000 g',
    precio: 19.99,
  },
  {
    slug: 'classico-espresso-250-g-granos-de-cafe-delonghi',
    nombre: 'DeLonghi Classico Espresso 250 g Granos de café',
    marca: "De'Longhi",
    peso: '250 g',
    precio: 5.09,
  },
  {
    slug: 'selezione-espresso-250-g-granos-de-cafe-delonghi',
    nombre: 'DeLonghi Selezione Espresso 250 g Granos de café',
    marca: "De'Longhi",
    peso: '250 g',
    precio: 5.09,
  },

  // ═══ Kaffekapslen (8) ═══
  {
    slug: 'crema-1000-g-cafe-diario-granos-de-cafe',
    nombre: 'Kaffekapslen Crema - Café diario 1000 g Granos de café',
    marca: 'Kaffekapslen',
    peso: '1000 g',
    precio: 14.09,
  },
  {
    slug: 'classic-1000-g-cafe-diario-granos-de-cafe',
    nombre: 'Kaffekapslen Classic - Café diario 1000 g Granos de café',
    marca: 'Kaffekapslen',
    peso: '1000 g',
    precio: 12.29,
  },
  {
    slug: 'aroma-cafe-diario-kaffekapslen',
    nombre: 'Kaffekapslen Aroma - Café diario 1000 g Granos de café',
    marca: 'Kaffekapslen',
    peso: '1000 g',
    precio: 17.29,
  },
  {
    slug: 'espresso-intenso-1000-g-cafe-diario-granos-de-cafe',
    nombre: 'Kaffekapslen Espresso Intenso - Café diario 1000 g Granos de café',
    marca: 'Kaffekapslen',
    peso: '1000 g',
    precio: 13.99,
  },
  {
    slug: 'espresso-1000-g-cafe-diario-granos-de-cafe',
    nombre: 'Kaffekapslen Espresso - Café diario 1000 g Granos de café',
    marca: 'Kaffekapslen',
    peso: '1000 g',
    precio: 13.59,
  },
  {
    slug: 'dynamite-coffee-250-g-granos-de-cafe',
    nombre: 'Kaffekapslen Dynamite Coffee 250 g Granos de café',
    marca: 'Kaffekapslen',
    peso: '250 g',
    precio: 2.79,
  },
  {
    slug: 'descafeinado-cafe-diario-kaffekapslen-granos-de-cafe',
    nombre: 'Kaffekapslen Descafeinado - Café diario 500 g Granos de café',
    marca: 'Kaffekapslen',
    peso: '500 g',
    precio: 10.89,
    descafeinado: true,
  },
  {
    slug: 'blonde-roast-cafe-diario-granos-de-cafe',
    nombre: 'Kaffekapslen Blonde Roast - Café diario 1000 g Granos de café',
    marca: 'Kaffekapslen',
    peso: '1000 g',
    precio: 12.29,
  },

  // ═══ Melitta (6) ═══
  {
    slug: 'bellacrema-la-crema-melitta',
    nombre: 'Melitta BellaCrema La Crema 1 kg Granos de café',
    marca: 'Melitta',
    peso: '1000 g',
    precio: 18.29,
  },
  {
    slug: 'bellacrema-descafeinado-melitta',
    nombre: 'Melitta BellaCrema Descafeinado 1 kg Granos de café',
    marca: 'Melitta',
    peso: '1000 g',
    precio: 18.09,
    descafeinado: true,
  },
  {
    slug: 'bellacrema-speciale-melitta',
    nombre: 'Melitta BellaCrema Speciale 1 kg Granos de café',
    marca: 'Melitta',
    peso: '1000 g',
    precio: 18.59,
  },
  {
    slug: 'bellacrema-intenso-melitta',
    nombre: 'Melitta BellaCrema Intenso 1 kg Granos de café',
    marca: 'Melitta',
    peso: '1000 g',
    precio: 18.09,
  },
  {
    slug: 'bellacrema-selection-melitta',
    nombre: 'Melitta BellaCrema Selection des Jahres 1 kg Granos de café',
    marca: 'Melitta',
    peso: '1000 g',
    precio: 18.29,
  },
  {
    slug: 'bellacrema-espresso-melitta',
    nombre: 'Melitta BellaCrema Espresso 1 kg Granos de café',
    marca: 'Melitta',
    peso: '1000 g',
    precio: 18.19,
  },

  // ═══ Mövenpick (6) ═══
  {
    slug: 'der-himmlische-movenpick-granos-de-caf-1kg',
    nombre: 'Mövenpick Der Himmlische 1 kg Granos de café',
    marca: 'Mövenpick',
    peso: '1000 g',
    precio: 19.99,
  },
  {
    slug: 'espresso-movenpick-granos-de-caf-1kg',
    nombre: 'Mövenpick Espresso 1 kg Granos de café',
    marca: 'Mövenpick',
    peso: '1000 g',
    precio: 19.49,
  },
  {
    slug: 'crema-gusto-italiano-movenpick-granos-de-caf-1kg',
    nombre: 'Mövenpick Caffè Crema Gusto Italiano 1 kg Granos de café',
    marca: 'Mövenpick',
    peso: '1000 g',
    precio: 19.79,
  },
  {
    slug: 'crema-movenpick-granos-de-caf-1kg',
    nombre: 'Mövenpick Caffè Crema 1 kg Granos de café',
    marca: 'Mövenpick',
    peso: '1000 g',
    precio: 19.69,
  },
  {
    slug: 'autentico-movenpick-granos-de-caf-1kg',
    nombre: 'Mövenpick Caffè Crema Auténtico 1 kg Granos de café',
    marca: 'Mövenpick',
    peso: '1000 g',
    precio: 19.99,
  },
  {
    slug: 'crema-schumli-movenpick-granos-de-caf-1kg',
    nombre: 'Mövenpick Caffè Crema Schümli 1 kg Granos de café',
    marca: 'Mövenpick',
    peso: '1000 g',
    precio: 20.09,
  },

  // ═══ Zoégas (7) ═══
  {
    slug: 'intenzo-zoegas-granos-de-cafe-500g',
    nombre: 'Zoégas Intenzo 500 g Granos de café',
    marca: 'Zoégas',
    peso: '500 g',
    precio: 9.09,
  },
  {
    slug: 'espresso-trattoria-zoegas-granos-de-cafe',
    nombre: 'Zoégas Espresso Trattoria 450 g Granos de café',
    marca: 'Zoégas',
    peso: '450 g',
    precio: 9.59,
  },
  {
    slug: 'mollbergs-zoegas-granos-de-cafe',
    nombre: 'Zoégas Mollbergs 450 g Granos de café',
    marca: 'Zoégas',
    peso: '450 g',
    precio: 9.69,
  },
  {
    slug: 'espresso-della-casa-granos-de-cafe-zoegas',
    nombre: 'Zoégas Espresso Della Casa 450 g Granos de café',
    marca: 'Zoégas',
    peso: '450 g',
    precio: 9.49,
  },
  {
    slug: 'blue-java-zoegas-granos-de-cafe-500g',
    nombre: 'Zoégas Blue Java 500 g Granos de café',
    marca: 'Zoégas',
    peso: '500 g',
    precio: 10.39,
  },
  {
    slug: 'skanerost-granos-de-cafe-zoegas-500g',
    nombre: 'Zoégas Skånerost 500 g Granos de café',
    marca: 'Zoégas',
    peso: '500 g',
    precio: 10.39,
  },
  {
    slug: 'hazienda-zoegas-granos-de-cafe',
    nombre: 'Zoégas Hazienda 450 g Granos de café',
    marca: 'Zoégas',
    peso: '450 g',
    precio: 10.89,
  },

  // ═══ L'OR (5) ═══
  {
    slug: 'crema-profond-lor-granos-de-cafe',
    nombre: "L'OR Crema Profond 500 g Granos de café",
    marca: "L'OR",
    peso: '500 g',
    precio: 10.29,
  },
  {
    slug: 'crema-absolu-classique-lor',
    nombre: "L'OR Crema Absolu Classique 1 kg Granos de café",
    marca: "L'OR",
    peso: '1000 g',
    precio: 20.79,
  },
  {
    slug: 'espresso-brazil-lor-granos-de-cafe',
    nombre: "L'OR Espresso Brazil 1 kg Granos de café",
    marca: "L'OR",
    peso: '1000 g',
    precio: 19.49,
    origen: 'Brasil',
  },
  {
    slug: 'crema-classique-lor-granos-de-cafe',
    nombre: "L'OR Crema Classique 500 g Granos de café",
    marca: "L'OR",
    peso: '500 g',
    precio: 10.29,
  },
  {
    slug: 'espresso-forza-kaffebonner-l-or',
    nombre: "L'OR Espresso Forza 1 kg Granos de café",
    marca: "L'OR",
    peso: '1000 g',
    precio: 19.59,
  },

  // ═══ Starbucks (5) ═══
  {
    slug: 'pike-place-roast-450-g-starbucks-granos-de-cafe',
    nombre: 'Starbucks Pike Place Roast 450 g Granos de café',
    marca: 'Starbucks',
    peso: '450 g',
    precio: 12.59,
  },
  {
    slug: 'espresso-roast-starbucks-450-g-granos-de-cafe',
    nombre: 'Starbucks Espresso Roast 450 g Granos de café',
    marca: 'Starbucks',
    peso: '450 g',
    precio: 12.59,
  },
  {
    slug: 'blonde-roast-espresso-450-g-starbucks-granos-de-cafe',
    nombre: 'Starbucks Blonde Espresso Roast 450 g Granos de café',
    marca: 'Starbucks',
    peso: '450 g',
    precio: 12.59,
  },
  {
    slug: 'holiday-blend-starbucks-190-g-kaffeebohnen',
    nombre: 'Starbucks Holiday Blend 190 g Granos de café',
    marca: 'Starbucks',
    peso: '190 g',
    precio: 4.19,
  },
  {
    slug: 'holiday-blend-950-g-granos-cafe',
    nombre: 'Starbucks Holiday Blend 950 g Granos de café',
    marca: 'Starbucks',
    peso: '950 g',
    precio: 20.89,
  },

  // ═══ Café Royal (5) ═══
  {
    slug: 'espresso-forte-gastro-cafe-royal-granos-de-cafe',
    nombre: 'Café Royal Espresso Forte Gastro 1000 g Granos de café',
    marca: 'Café Royal',
    peso: '1000 g',
    precio: 18.49,
  },
  {
    slug: 'crema-gastro-cafe-royal-granos-de-cafe',
    nombre: 'Café Royal Crema Gastro 1000 g Granos de café',
    marca: 'Café Royal',
    peso: '1000 g',
    precio: 19.09,
  },
  {
    slug: 'gastro-descafeinado-cafe-royal-granos-de-cafe',
    nombre: 'Café Royal Gastro Descafeinado 500 g Granos de café',
    marca: 'Café Royal',
    peso: '500 g',
    precio: 12.09,
    descafeinado: true,
  },
  {
    slug: 'espresso-gastro-cafe-royal-granos-de-cafe',
    nombre: 'Café Royal Espresso Gastro 1000 g Granos de café',
    marca: 'Café Royal',
    peso: '1000 g',
    precio: 18.49,
  },

  // ═══ Black Coffee Roasters (5) ═══
  {
    slug: 'supreme-black-coffee-roasters-400g-granos-cafe',
    nombre: 'Black Coffee Roasters Supreme 400 g Granos de café',
    marca: 'Black Coffee Roasters',
    peso: '400 g',
    precio: 7.99,
  },
  {
    slug: 'gourmet-black-coffee-roasters-400g-granos-cafe',
    nombre: 'Black Coffee Roasters Gourmet 400 g Granos de café',
    marca: 'Black Coffee Roasters',
    peso: '400 g',
    precio: 7.99,
  },
  {
    slug: 'espresso-double-roast-400-g-granos-de-cafe-black-coffee-roasters',
    nombre: 'Black Coffee Roasters Espresso Double Roast 400 g Granos de café',
    marca: 'Black Coffee Roasters',
    peso: '400 g',
    precio: 7.99,
  },
  {
    slug: 'espresso-moerk-crema-400-g-granos-de-black-coffee-roasters',
    nombre: 'Black Coffee Roasters Espresso Mørk Crema 400 g Granos de café',
    marca: 'Black Coffee Roasters',
    peso: '400 g',
    precio: 9.29,
  },
  {
    slug: 'crema-black-coffee-roasters-400g-granos-cafe',
    nombre: 'Black Coffee Roasters Crema 400 g Granos de café',
    marca: 'Black Coffee Roasters',
    peso: '400 g',
    precio: 7.99,
  },

  // ═══ Domus Barista (4) ═══
  {
    slug: 'domus-barista-single-origin-brasil',
    nombre: 'Domus Barista Single Origin Brasil 450 g Granos de café',
    marca: 'Domus Barista',
    peso: '450 g',
    precio: 8.39,
    origen: 'Brasil',
  },
  {
    slug: 'domus-barista-single-orgin-sumatra',
    nombre: 'Domus Barista Single Origin Sumatra 450 g Granos de café',
    marca: 'Domus Barista',
    peso: '450 g',
    precio: 7.19,
    origen: 'Sumatra',
  },
  {
    slug: 'domus-barista-single-origin-colombia',
    nombre: 'Domus Barista Single Origin Colombia 450 g Granos de café',
    marca: 'Domus Barista',
    peso: '450 g',
    precio: 7.49,
    origen: 'Colombia',
  },
  {
    slug: 'domus-barista-single-origin-mexico',
    nombre: 'Domus Barista Single Origin Mexico 450 g Granos de café',
    marca: 'Domus Barista',
    peso: '450 g',
    precio: 11.29,
    origen: 'México',
  },

  // ═══ Costa (4) ═══
  {
    slug: 'signature-blend-costa-coffee-granos-de-cafe-400',
    nombre: 'Costa Signature Blend 400 g Granos de café',
    marca: 'Costa',
    peso: '400 g',
    precio: 9.19,
  },
  {
    slug: 'intense-amazonian-blend-costa-coffee-granos-de-cafe-1000',
    nombre: 'Costa Intense Amazonian Blend 1000 g Granos de café',
    marca: 'Costa',
    peso: '1000 g',
    precio: 19.59,
  },
  {
    slug: 'intense-amazonian-blend-costa-coffee-granos-de-cafe-200',
    nombre: 'Costa Intense Amazonian Blend 200 g Granos de café',
    marca: 'Costa',
    peso: '200 g',
    precio: 4.69,
  },
  {
    slug: 'signature-blend-costa-coffee-granos-de-cafe-200',
    nombre: 'Costa Signature Blend 200 g Granos de café',
    marca: 'Costa',
    peso: '200 g',
    precio: 4.89,
  },

  // ═══ Garibaldi (3) ═══
  {
    slug: 'gusto-dolce-granos-de-cafe-1000-g-garibaldi',
    nombre: 'Garibaldi Gusto Dolce 1000 g Granos de café',
    marca: 'Garibaldi',
    peso: '1000 g',
    precio: 15.99,
  },
  {
    slug: 'intenso-granos-de-cafe-1000-g-garibaldi',
    nombre: 'Garibaldi Intenso 1000 g Granos de café',
    marca: 'Garibaldi',
    peso: '1000 g',
    precio: 14.29,
  },
  {
    slug: 'espresso-bar-granos-de-cafe-1000-g-garibaldi',
    nombre: 'Garibaldi Espresso Bar 1000 g Granos de café',
    marca: 'Garibaldi',
    peso: '1000 g',
    precio: 13.89,
  },

  // ═══ Gimoka (2) ═══
  {
    slug: 'dulcis-vitae-granos-de-cafe-1000-g-gimoka',
    nombre: 'Gimoka Dulcis Vitae 1000 g Granos de café',
    marca: 'Gimoka',
    peso: '1000 g',
    precio: 12.29,
  },
  {
    slug: 'supremo-1000-g-gimoka-granos-de-cafe',
    nombre: 'Gimoka Supremo 1000 g Granos de café',
    marca: 'Gimoka',
    peso: '1000 g',
    precio: 13.59,
  },

  // ═══ Gevalia (2) ═══
  {
    slug: 'espresso-gevalia-900-g-granos-de-cafe',
    nombre: 'Gevalia Espresso 900 g Granos de café',
    marca: 'Gevalia',
    peso: '900 g',
    precio: 17.59,
  },
  {
    slug: 'crema-gevalia-900-g-granos-de-cafe',
    nombre: 'Gevalia Crema 900 g Granos de café',
    marca: 'Gevalia',
    peso: '900 g',
    precio: 17.59,
  },
];

function httpGet(url, wantBuf = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,image/webp,*/*;q=0.8',
      },
    };
    const get = (o) =>
      https
        .get(o, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : `https://${parsed.hostname}${res.headers.location}`;
            const p2 = new URL(loc);
            return get({
              hostname: p2.hostname,
              path: p2.pathname + p2.search,
              headers: o.headers,
            });
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            resolve({ data: wantBuf ? buf : buf.toString(), status: res.statusCode });
          });
          res.on('error', reject);
        })
        .on('error', reject);
    get(opts);
  });
}

async function discoverImageUrl(productUrl) {
  try {
    const { data: html, status } = await httpGet(productUrl);
    if (status !== 200) return null;
    let m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-1201\.webp/
    );
    if (m) return m[0];
    m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-0001\.(jpg|webp)/
    );
    if (m) return m[0];
    m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?\.(webp|jpg)/
    );
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

async function uploadPhoto(docId, imgUrl) {
  const { data: buf } = await httpGet(imgUrl, true);
  if (buf.length < 1000) return null;
  const out = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(out, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

function photoFields(url) {
  return {
    fotoUrl: url,
    foto: url,
    imageUrl: url,
    officialPhoto: url,
    bestPhoto: url,
    imagenUrl: url,
    photos: { selected: url, original: url, bgRemoved: url },
  };
}

function slugToId(slug) {
  return slug.replace(/-/g, '_').substring(0, 60);
}

(async () => {
  console.log(`\n=== Importing ${ALL.length} café en grano from kaffek.es ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;

  for (const p of ALL) {
    const docId = 'grano_' + slugToId(p.slug);
    const existing = await db.collection('cafes').doc(docId).get();
    if (existing.exists) {
      console.log(`SKIP: ${docId}`);
      skipped++;
      continue;
    }

    const productUrl = `https://kaffek.es/${p.slug}.html`;
    process.stdout.write(`CREATE: ${docId}`);

    let imgUrl = null;
    try {
      imgUrl = await discoverImageUrl(productUrl);
    } catch {}

    const data = {
      nombre: p.nombre,
      marca: p.marca,
      roaster: p.marca,
      tipo: 'grano',
      tipoProducto: 'grano',
      formato: `Café en grano ${p.peso}`,
      tamano: p.peso,
      peso: p.peso,
      precio: p.precio,
      fuente: 'KaffeK',
      fuentePais: 'ES',
      fuenteUrl: productUrl,
      fecha: new Date().toISOString(),
      puntuacion: 0,
      votos: 0,
      status: 'approved',
      reviewStatus: 'approved',
      appVisible: true,
      updatedAt: new Date().toISOString(),
    };
    if (p.origen) data.origen = p.origen;
    if (p.descafeinado) data.descafeinado = true;

    if (imgUrl) {
      try {
        const photoUrl = await uploadPhoto(docId, imgUrl);
        if (photoUrl) {
          Object.assign(data, photoFields(photoUrl));
          photos++;
        }
      } catch (e) {
        console.log(` Photo ERR: ${e.message}`);
        errors++;
      }
    }

    try {
      await db.collection('cafes').doc(docId).set(data);
      created++;
      console.log(` → ${p.precio}€ ${imgUrl ? '📸' : '⚠️'}`);
    } catch (e) {
      console.log(` DB ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created} | Skipped: ${skipped} | Photos: ${photos} | Errors: ${errors}`);
  process.exit(0);
})();

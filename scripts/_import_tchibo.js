#!/usr/bin/env node
/**
 * _import_tchibo.js – April 2026
 * Import Tchibo products from coffeehenk.com (97 results, ~70 actual Tchibo products)
 * Excludes: gift packages, test packages, trial packs, non-Tchibo brands
 * Brand: Tchibo – German coffee company
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
  // ═══ Coffee Beans (Grano) ═══
  {
    id: 'tchibo_barista_espresso',
    nombre: 'Tchibo Barista Espresso 1kg',
    precio: 16.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Fuerte',
    variedad: '100% Arábica',
    slug: 'tchibo-barista-espresso',
  },
  {
    id: 'tchibo_professional_espresso',
    nombre: 'Tchibo Professional Espresso 1kg',
    precio: 13.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-professional-espresso',
  },
  {
    id: 'tchibo_aromatico_classico',
    nombre: 'Tchibo Aromatico Classico 1kg',
    precio: 12.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-aromatico-classico',
  },
  {
    id: 'tchibo_aromatico_intenso',
    nombre: 'Tchibo Aromatico Intenso 1kg',
    precio: 12.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Fuerte',
    variedad: '100% Robusta',
    slug: 'tchibo-aromatico-intenso',
  },
  {
    id: 'tchibo_caffe_crema_mild_1kg',
    nombre: 'Tchibo Caffè Crema Mild 1kg',
    precio: 15.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-caffe-crema-mild',
  },
  {
    id: 'tchibo_espresso_mailander_art',
    nombre: 'Tchibo Espresso Mailänder Art 1kg',
    precio: 15.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media-Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-espresso-mailander-art',
  },
  {
    id: 'tchibo_barista_caffe_crema',
    nombre: 'Tchibo Barista Caffè Crema 1kg',
    precio: 16.49,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media',
    variedad: '100% Arábica',
    slug: 'tchibo-barista-caffe-crema',
  },
  {
    id: 'tchibo_barista_espresso_dark',
    nombre: 'Tchibo Barista Espresso Dark 1kg',
    precio: 16.49,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Intensa',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-barista-espresso-dark',
  },
  {
    id: 'tchibo_caffe_crema_vollmundig_1kg',
    nombre: 'Tchibo Caffè Crema Vollmundig 1kg',
    precio: 15.75,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media-Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-caffe-crema-vollmundig',
  },
  {
    id: 'tchibo_espresso_sizilianer_art',
    nombre: 'Tchibo Espresso Sizilianer Art 1kg',
    precio: 15.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Intensa',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-espresso-sizilianer-art',
  },
  {
    id: 'tchibo_feine_milde_1kg',
    nombre: 'Tchibo Feine Milde 1kg',
    precio: 14.49,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Suave',
    variedad: '100% Arábica',
    slug: 'tchibo-feine-milde-1-kg',
  },
  {
    id: 'tchibo_for_black_n_white',
    nombre: "Tchibo For Black 'n White 1kg",
    precio: 13.75,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Muy Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-for-black-n-white',
  },
  {
    id: 'tchibo_exclusive_medium_roast',
    nombre: 'Tchibo Exclusive Medium Roast 1kg',
    precio: 15.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-exclusive-medium-roast',
  },
  {
    id: 'tchibo_exclusive_good_mood',
    nombre: 'Tchibo Exclusive Good Mood Blend 1kg',
    precio: 14.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media',
    variedad: 'Arábica y Robusta',
    blend: true,
    slug: 'tchibo-exclusive-good-mood-blend',
  },
  {
    id: 'tchibo_exclusive_original_1kg',
    nombre: 'Tchibo Exclusive Original 1kg',
    precio: 14.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media-Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-exclusive-original',
  },
  {
    id: 'tchibo_professional_caffe_crema',
    nombre: 'Tchibo Professional Caffè Crema 1kg',
    precio: 13.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media',
    variedad: '100% Arábica',
    slug: 'tchibo-professional-caffe-crema',
  },
  {
    id: 'tchibo_barista_espresso_export',
    nombre: 'Tchibo Barista Espresso (Export) 1kg',
    precio: 12.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Fuerte',
    variedad: '100% Arábica',
    slug: 'tchibo-barista-espresso-1',
  },
  {
    id: 'tchibo_gusto_tradizionale',
    nombre: 'Tchibo Gusto Tradizionale 1kg',
    precio: 10.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-gusto-tradizionale',
  },
  {
    id: 'tchibo_fair_choice_espresso',
    nombre: 'Tchibo Fair Choice Espresso 1kg',
    precio: 14.75,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-fair-choice-espresso',
  },
  {
    id: 'tchibo_fair_choice_caffe_crema',
    nombre: 'Tchibo Fair Choice Caffè Crema 1kg',
    precio: 14.75,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-fair-choice-caffe-crema',
  },
  {
    id: 'tchibo_barista_caffe_crema_export',
    nombre: 'Tchibo Barista Caffè Crema (Export) 1kg',
    precio: 14.99,
    tipo: 'grano',
    formato: '1kg',
    intensidad: 'Media',
    variedad: '100% Arábica',
    slug: 'tchibo-barista-caffe-crema-1',
  },
  {
    id: 'tchibo_sana_sanfter_moment_grano',
    nombre: 'Tchibo Sana Sanfter Moment 50% Caffeine Free 500g grano',
    precio: 7.99,
    tipo: 'grano',
    formato: '500g',
    intensidad: 'Suave',
    variedad: '100% Arábica',
    descafeinado: true,
    slug: 'tchibo-sana-sanfter-moment',
  },
  {
    id: 'tchibo_privat_kaffee_latin_grande_grano',
    nombre: 'Tchibo Privat Kaffee Latin Grande 500g grano',
    precio: 8.49,
    tipo: 'grano',
    formato: '500g',
    intensidad: 'Media',
    variedad: '100% Arábica',
    slug: 'tchibo-privat-kaffee-latin-grande-500gr',
  },
  {
    id: 'tchibo_privat_kaffee_brazil_mild_grano',
    nombre: 'Tchibo Privat Kaffee Brazil Mild 500g grano',
    precio: 8.49,
    tipo: 'grano',
    formato: '500g',
    intensidad: 'Suave',
    variedad: '100% Arábica',
    origen: 'Brasil',
    slug: 'tchibo-privat-kaffee-brazil-mild-ganze-bohne-500gr',
  },
  {
    id: 'tchibo_privat_kaffee_brazil_decaf_grano',
    nombre: 'Tchibo Privat Kaffee Brazil Decaf 500g grano',
    precio: 8.49,
    tipo: 'grano',
    formato: '500g',
    intensidad: 'Suave',
    variedad: '100% Arábica',
    origen: 'Brasil',
    descafeinado: true,
    slug: 'tchibo-privat-kaffee-brazil-decaf-500-gram',
  },
  {
    id: 'tchibo_feine_milde_500g_grano',
    nombre: 'Tchibo Feine Milde 500g grano',
    precio: 7.25,
    tipo: 'grano',
    formato: '500g',
    intensidad: 'Suave',
    variedad: '100% Arábica',
    slug: 'feine-milde-ganze-bohne-500gr',
  },
  {
    id: 'tchibo_beste_bohne_500g_grano',
    nombre: 'Tchibo Beste Bohne 500g grano',
    precio: 8.35,
    tipo: 'grano',
    formato: '500g',
    intensidad: 'Media-Fuerte',
    variedad: '100% Arábica',
    slug: 'tchibo-beste-bohne-ganze-bohne-500gr',
  },

  // ═══ Ground Coffee (Molido) ═══
  {
    id: 'tchibo_feine_milde_500g_molido',
    nombre: 'Tchibo Feine Milde 500g molido',
    precio: 7.25,
    tipo: 'molido',
    formato: '500g',
    intensidad: 'Suave',
    variedad: '100% Arábica',
    slug: 'tchibo-feine-milde',
  },
  {
    id: 'tchibo_family_500g_molido',
    nombre: 'Tchibo Family 500g molido',
    precio: 5.99,
    tipo: 'molido',
    formato: '500g',
    intensidad: 'Intensa',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-family-500g',
  },
  {
    id: 'tchibo_herzhaft_mild_500g',
    nombre: 'Tchibo Herzhaft Mild / Der Herzhafte 500g molido',
    precio: 6.39,
    tipo: 'molido',
    formato: '500g',
    intensidad: 'Media-Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-herzhaft-mild-der-herzhafte',
  },
  {
    id: 'tchibo_black_n_white_500g_molido',
    nombre: "Tchibo Black 'n White 500g molido",
    precio: 6.75,
    tipo: 'molido',
    formato: '500g',
    intensidad: 'Fuerte',
    variedad: 'Arábica y Robusta',
    slug: 'tchibo-black-white',
  },
  {
    id: 'tchibo_beste_bohne_500g_molido',
    nombre: 'Tchibo Beste Bohne 500g molido',
    precio: 7.99,
    tipo: 'molido',
    formato: '500g',
    intensidad: 'Media-Fuerte',
    variedad: '100% Arábica',
    slug: 'tchibo-beste-bohne',
  },
  {
    id: 'tchibo_privat_kaffee_latin_grande_molido',
    nombre: 'Tchibo Privat Kaffee Latin Grande 500g molido',
    precio: 8.19,
    tipo: 'molido',
    formato: '500g',
    intensidad: 'Media',
    variedad: '100% Arábica',
    slug: 'tchibo-privat-kaffee-latin-grande',
  },
  {
    id: 'tchibo_privat_kaffee_brazil_mild_molido',
    nombre: 'Tchibo Privat Kaffee Brazil Mild 500g molido',
    precio: 7.98,
    tipo: 'molido',
    formato: '500g',
    intensidad: 'Suave',
    variedad: '100% Arábica',
    origen: 'Brasil',
    slug: 'tchibo-privat-kaffee-brazil-mild-ground-coffee',
  },
  {
    id: 'tchibo_sana_sanfter_moment_molido',
    nombre: 'Tchibo Sana Sanfter Moment 50% Caffeine Free 500g molido',
    precio: 7.69,
    tipo: 'molido',
    formato: '500g',
    intensidad: 'Suave',
    variedad: '100% Arábica',
    descafeinado: true,
    slug: 'tchibo-sana-sanfter-moment-50-caffeine-free',
  },
  {
    id: 'tchibo_turk_kahvesi',
    nombre: 'Tchibo Türk Kahvesi 100g',
    precio: 1.85,
    tipo: 'molido',
    formato: '100g',
    intensidad: 'Media',
    variedad: '100% Arábica',
    slug: 'tchibo-turk-kahvesi',
  },

  // ═══ Coffee Pods (Senseo) ═══
  {
    id: 'tchibo_feine_milde_36_pads',
    nombre: 'Tchibo Feine Milde 36 monodosis Senseo',
    precio: 4.99,
    tipo: 'capsula',
    formato: '36 monodosis',
    sistema: 'Senseo',
    intensidad: 'Suave',
    slug: 'tchibo-feine-milde-vorteilpack',
  },
  {
    id: 'tchibo_caffe_crema_vollmundig_36_pads',
    nombre: 'Tchibo Caffè Crema Vollmundig 36 monodosis Senseo',
    precio: 4.99,
    tipo: 'capsula',
    formato: '36 monodosis',
    sistema: 'Senseo',
    intensidad: 'Media',
    slug: 'tchibo-caff-crema-vollmundig-vorteilpack',
  },
  {
    id: 'tchibo_black_n_white_36_pads',
    nombre: "Tchibo Black 'n White 36 monodosis Senseo",
    precio: 4.99,
    tipo: 'capsula',
    formato: '36 monodosis',
    sistema: 'Senseo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-black-n-white-pads',
  },
  {
    id: 'tchibo_black_n_white_100_pads',
    nombre: "Tchibo Black 'n White Mega 100 monodosis Senseo",
    precio: 13.25,
    tipo: 'capsula',
    formato: '100 monodosis',
    sistema: 'Senseo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-black-white-100-pads',
  },
  {
    id: 'tchibo_caffe_crema_vollmundig_100_pads',
    nombre: 'Tchibo Caffè Crema Vollmundig Mega 100 monodosis Senseo',
    precio: 13.25,
    tipo: 'capsula',
    formato: '100 monodosis',
    sistema: 'Senseo',
    intensidad: 'Media',
    slug: 'tchibo-caffe-crema-vollmundig-100-pads',
  },
  {
    id: 'tchibo_feine_milde_100_pads',
    nombre: 'Tchibo Feine Milde Mega 100 monodosis Senseo',
    precio: 13.25,
    tipo: 'capsula',
    formato: '100 monodosis',
    sistema: 'Senseo',
    intensidad: 'Suave',
    slug: 'tchibo-feine-milde-100-pads-vorteilpack',
  },

  // ═══ Cafissimo Capsules ═══
  {
    id: 'tchibo_cafissimo_espresso_brasil',
    nombre: 'Tchibo Cafissimo Espresso Brasil 10 cápsulas',
    precio: 3.55,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Intensa',
    origen: 'Brasil',
    slug: 'tchibo-cafissimo-espresso-brasil',
  },
  {
    id: 'tchibo_cafissimo_espresso_caramel',
    nombre: 'Tchibo Cafissimo Espresso Caramel 10 cápsulas',
    precio: 3.6,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    sabor: 'Caramelo',
    slug: 'tchibo-cafissimo-espresso-caramel',
  },
  {
    id: 'tchibo_cafissimo_barista_espresso',
    nombre: 'Tchibo Cafissimo Barista Espresso 10 cápsulas',
    precio: 3.25,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Intensa',
    slug: 'tchibo-cafissimo-barista-espresso',
  },
  {
    id: 'tchibo_cafissimo_espresso_vanilla',
    nombre: 'Tchibo Cafissimo Espresso Vanilla 10 cápsulas',
    precio: 4.25,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    sabor: 'Vainilla',
    slug: 'tchibo-cafissimo-espresso-vanilla',
  },
  {
    id: 'tchibo_cafissimo_espresso_double_choc',
    nombre: 'Tchibo Cafissimo Espresso Double Choc 10 cápsulas',
    precio: 3.55,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Muy Fuerte',
    sabor: 'Chocolate',
    slug: 'tchibo-cafissimo-espresso-double-choc',
  },
  {
    id: 'tchibo_cafissimo_espresso_irish_cream',
    nombre: 'Tchibo Cafissimo Espresso Irish Cream 10 cápsulas',
    precio: 3.6,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Fuerte',
    sabor: 'Irish Cream',
    slug: 'tchibo-cafissimo-espresso-irish-cream',
  },
  {
    id: 'tchibo_cafissimo_espresso_pistachio_choc',
    nombre: 'Tchibo Cafissimo Espresso Pistachio & Chocolate 10 cápsulas',
    precio: 3.55,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Fuerte',
    sabor: 'Pistacho y Chocolate',
    slug: 'tchibo-cafissimo-espresso-pistachio-chocolate',
  },
  {
    id: 'tchibo_cafissimo_espresso_intense_aroma',
    nombre: 'Tchibo Cafissimo Espresso Intense Aroma 10 cápsulas',
    precio: 2.99,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Muy Fuerte',
    slug: 'tchibo-cafissimo-cafe-kraftig',
  },
  {
    id: 'tchibo_cafissimo_espresso_elegant',
    nombre: 'Tchibo Cafissimo Espresso Elegant Aroma 10 cápsulas',
    precio: 1.99,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-cafissimo-espresso-elegant',
  },
  {
    id: 'tchibo_cafissimo_caffe_crema_decaf',
    nombre: 'Tchibo Cafissimo Caffè Crema Decaffeinated 10 cápsulas',
    precio: 3.19,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media',
    descafeinado: true,
    slug: 'tchibo-cafissimo-caffe-crema-decaffeinated',
  },
  {
    id: 'tchibo_cafissimo_coffee_intense_aroma',
    nombre: 'Tchibo Cafissimo Coffee Intense Aroma 10 cápsulas',
    precio: 2.99,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-cafissimo-kaffee-kraftig',
  },
  {
    id: 'tchibo_cafissimo_barista_caffe_crema',
    nombre: 'Tchibo Cafissimo Barista Caffè Crema 10 cápsulas',
    precio: 3.55,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media',
    slug: 'tchibo-cafissimo-barista-caffe-crema',
  },
  {
    id: 'tchibo_cafissimo_caffe_crema_fine_aroma',
    nombre: 'Tchibo Cafissimo Caffè Crema Fine Aroma 10 cápsulas',
    precio: 2.99,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media',
    slug: 'tchibo-cafissimo-caffe-crema-mild',
  },
  {
    id: 'tchibo_cafissimo_caffe_crema_rich_aroma',
    nombre: 'Tchibo Cafissimo Caffè Crema Rich Aroma 10 cápsulas',
    precio: 2.99,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-cafissimo-caffe-crema-vollmundig',
  },
  {
    id: 'tchibo_cafissimo_kaffee_mild',
    nombre: 'Tchibo Cafissimo Coffee Fine Aroma 10 cápsulas',
    precio: 2.99,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media',
    slug: 'tchibo-cafissimo-caffe-mild',
  },
  {
    id: 'tchibo_cafissimo_caffe_crema_colombia',
    nombre: 'Tchibo Cafissimo Caffè Crema Colombia 10 cápsulas',
    precio: 3.55,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    origen: 'Colombia',
    slug: 'tchibo-cafissimo-caffe-crema-colombia',
  },
  {
    id: 'tchibo_cafissimo_caffe_crema_xl',
    nombre: 'Tchibo Cafissimo Caffè Crema XL 10 cápsulas',
    precio: 3.35,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-cafissimo-wake-up-coffee-caffe-crema-xl-intense',
  },

  // ═══ Cafissimo Big Packs ═══
  {
    id: 'tchibo_cafissimo_espresso_kraftig_96',
    nombre: 'Tchibo Cafissimo Espresso Kräftig Big Pack 96 cápsulas',
    precio: 23.99,
    tipo: 'capsula',
    formato: '96 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Fuerte',
    slug: 'tchibo-cafissimo-espresso-kraftig-voordeel-verpakking',
  },
  {
    id: 'tchibo_cafissimo_caffe_crema_vollmundig_96',
    nombre: 'Tchibo Cafissimo Caffè Crema Vollmundig Big Pack 96 cápsulas',
    precio: 24.99,
    tipo: 'capsula',
    formato: '96 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-cafissimo-caffe-crema-vollmundig-voordeel-verpakking',
  },
  {
    id: 'tchibo_cafissimo_espresso_brasil_96',
    nombre: 'Tchibo Cafissimo Espresso Brasil Big Pack 96 cápsulas',
    precio: 27.99,
    tipo: 'capsula',
    formato: '96 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Intensa',
    origen: 'Brasil',
    slug: 'tchibo-cafissimo-espresso-brasil-big-pack',
  },
  {
    id: 'tchibo_cafissimo_decaf_30',
    nombre: 'Tchibo Cafissimo Decaffeinato Big Pack 30 cápsulas',
    precio: 7.99,
    tipo: 'capsula',
    formato: '30 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media',
    descafeinado: true,
    slug: 'tchibo-cafissimo-decaffeinato-big-pack',
  },
  {
    id: 'tchibo_cafissimo_coffee_intense_30',
    nombre: 'Tchibo Cafissimo Coffee Intense Aroma Big Pack 30 cápsulas',
    precio: 7.99,
    tipo: 'capsula',
    formato: '30 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-cafissimo-coffee-intense',
  },
  {
    id: 'tchibo_cafissimo_espresso_intense_30',
    nombre: 'Tchibo Cafissimo Espresso Intense Aroma Big Pack 30 cápsulas',
    precio: 7.99,
    tipo: 'capsula',
    formato: '30 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Fuerte',
    slug: 'tchibo-cafissimo-espresso-intense-aroma-big-pack',
  },
  {
    id: 'tchibo_cafissimo_espresso_elegant_30',
    nombre: 'Tchibo Cafissimo Espresso Elegant Aroma Big Pack 30 cápsulas',
    precio: 7.99,
    tipo: 'capsula',
    formato: '30 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-cafissimo-espresso-elegant-aroma-big-pack',
  },
  {
    id: 'tchibo_cafissimo_kaffee_fine_aroma_30',
    nombre: 'Tchibo Cafissimo Kaffee Fine Aroma Big Pack 30 cápsulas',
    precio: 7.99,
    tipo: 'capsula',
    formato: '30 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Suave',
    slug: 'tchibo-cafissimo-kaffee-fine-aroma-big-pack',
  },
  {
    id: 'tchibo_cafissimo_caffe_crema_rich_30',
    nombre: 'Tchibo Cafissimo Caffè Crema Rich Aroma Big Pack 30 cápsulas',
    precio: 7.99,
    tipo: 'capsula',
    formato: '30 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    slug: 'tchibo-cafissimo-caffe-crema-rich-aroma-big-pack',
  },
  {
    id: 'tchibo_cafissimo_caffe_crema_fine_30',
    nombre: 'Tchibo Cafissimo Caffè Crema Fine Aroma Big Pack 30 cápsulas',
    precio: 7.99,
    tipo: 'capsula',
    formato: '30 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Suave',
    slug: 'tchibo-cafissimo-caffe-crema-fine-aroma-big-pack',
  },
  {
    id: 'tchibo_cafissimo_caffe_crema_colombia_96',
    nombre: 'Tchibo Cafissimo Caffè Crema Colombia Big Pack 96 cápsulas',
    precio: 27.99,
    tipo: 'capsula',
    formato: '96 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media-Fuerte',
    origen: 'Colombia',
    slug: 'tchibo-cafissimo-caffe-crema-colombia-big-pack',
  },
  {
    id: 'tchibo_cafissimo_kaffee_mild_96',
    nombre: 'Tchibo Cafissimo Kaffee Mild Big Pack 96 cápsulas',
    precio: 23.99,
    tipo: 'capsula',
    formato: '96 cápsulas',
    sistema: 'Cafissimo',
    intensidad: 'Media',
    slug: 'tchibo-cafissimo-kaffee-mild-voordeel-verpakking',
  },

  // ═══ Nespresso compatible ═══
  {
    id: 'tchibo_gran_cafe_espresso_leggero',
    nombre: 'Tchibo Gran Café Espresso Leggero 10 cápsulas Nespresso',
    precio: 2.79,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Nespresso',
    intensidad: 'Media',
    slug: 'tchibo-espresso-leggero',
  },
  {
    id: 'tchibo_gran_cafe_ristretto',
    nombre: 'Tchibo Gran Café Ristretto 10 cápsulas Nespresso',
    precio: 2.79,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Nespresso',
    intensidad: 'Intensa',
    slug: 'tchibo-gran-cafe-ristretto',
  },
  {
    id: 'tchibo_gran_cafe_lungo',
    nombre: 'Tchibo Gran Café Lungo 10 cápsulas Nespresso',
    precio: 2.79,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Nespresso',
    intensidad: 'Media',
    slug: 'tchibo-gran-cafe-lungo',
  },
  {
    id: 'tchibo_gran_cafe_espresso_classico',
    nombre: 'Tchibo Gran Café Espresso Classico 10 cápsulas Nespresso',
    precio: 2.79,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Nespresso',
    intensidad: 'Fuerte',
    slug: 'tchibo-gran-cafe-espresso-classico',
  },
  {
    id: 'tchibo_gran_cafe_espresso_forte',
    nombre: 'Tchibo Gran Café Espresso Forte 10 cápsulas Nespresso',
    precio: 2.79,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Nespresso',
    intensidad: 'Muy Fuerte',
    slug: 'tchibo-gran-cafe-espresso-forte',
  },
  {
    id: 'tchibo_gran_cafe_lungo_leggero',
    nombre: 'Tchibo Gran Café Lungo Leggero 10 cápsulas Nespresso',
    precio: 2.79,
    tipo: 'capsula',
    formato: '10 cápsulas',
    sistema: 'Nespresso',
    intensidad: 'Suave',
    slug: 'tchibo-gran-cafe-lungo-leggero',
  },

  // ═══ Instant / Soluble ═══
  {
    id: 'tchibo_feine_milde_instant',
    nombre: 'Tchibo Feine Milde Instant 100g',
    precio: 5.49,
    tipo: 'soluble',
    formato: '100g',
    intensidad: 'Suave',
    slug: 'tchibo-feine-milde-oploskoffie',
  },
  {
    id: 'tchibo_black_n_white_instant',
    nombre: "Tchibo Black 'n White Instant 180g",
    precio: 6.49,
    tipo: 'soluble',
    formato: '180g',
    intensidad: 'Fuerte',
    slug: 'tchibo-black-n-white-oploskoffie',
  },
  {
    id: 'tchibo_eduscho_family_instant',
    nombre: 'Tchibo Eduscho Family Instant 200g',
    precio: 6.99,
    tipo: 'soluble',
    formato: '200g',
    slug: 'eduscho-family-200g',
  },
  {
    id: 'tchibo_barista_espresso_instant',
    nombre: 'Tchibo Barista Espresso Instant 200g',
    precio: 5.99,
    tipo: 'soluble',
    formato: '200g',
    slug: 'tchibo-barista-espresso-oploskoffie',
  },
  {
    id: 'tchibo_gold_selection_instant',
    nombre: 'Tchibo Gold Selection Instant 200g',
    precio: 7.49,
    tipo: 'soluble',
    formato: '200g',
    slug: 'tchibo-gold-selection',
  },
  {
    id: 'tchibo_exclusive_original_instant',
    nombre: 'Tchibo Exclusive Original Instant 200g',
    precio: 6.49,
    tipo: 'soluble',
    formato: '200g',
    slug: 'tchibo-exclusive-original-200g',
  },
  {
    id: 'tchibo_family_instant',
    nombre: 'Tchibo Family Instant 200g',
    precio: 6.99,
    tipo: 'soluble',
    formato: '200g',
    slug: 'tchibo-family-oploskoffie',
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
    // Magento og:image
    let m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (m) return m[1];
    // gallery image
    m = html.match(/"full_image_url"\s*:\s*"([^"]+)"/);
    if (m) return m[1].replace(/\\\//g, '/');
    // product-image-photo
    m = html.match(
      /<img[^>]+class=["'][^"']*product-image-photo[^"']*["'][^>]+src=["']([^"']+)["']/i
    );
    if (m) return m[1];
    return null;
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

(async () => {
  console.log(`\n=== Importing ${ALL.length} Tchibo products from coffeehenk.com ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;

  for (const p of ALL) {
    const docId = p.id;
    const existing = await db.collection('cafes').doc(docId).get();
    if (existing.exists) {
      console.log(`SKIP: ${docId}`);
      skipped++;
      continue;
    }

    process.stdout.write(`CREATE: ${docId}`);

    const productUrl = `https://www.coffeehenk.com/${p.slug}`;
    let imgUrl = null;
    try {
      imgUrl = await discoverImageUrl(productUrl);
    } catch {}

    const data = {
      nombre: p.nombre,
      marca: 'Tchibo',
      roaster: 'Tchibo',
      tipo: p.tipo,
      tipoProducto: p.tipo === 'capsula' ? 'capsulas' : p.tipo,
      formato: p.formato,
      tamano: p.formato,
      precio: p.precio,
      fuente: 'coffeehenk.com',
      fuentePais: 'NL',
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
    if (p.blend) data.blend = true;
    if (p.sabor) data.sabor = p.sabor;
    if (p.intensidad) data.intensidad = p.intensidad;
    if (p.variedad) data.variedad = p.variedad;
    if (p.sistema) {
      data.sistema = p.sistema;
      data.compatibilidad = p.sistema;
    }

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

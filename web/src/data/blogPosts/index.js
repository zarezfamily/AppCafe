const { coldBrewEnCasaGuiaCompleta } = require('./cold-brew-en-casa-guia-completa');
const { arabicaVsRobusta } = require('./arabica-vs-robusta');
const { cafeDeEspecialidadVsCafeNormal } = require('./cafe-de-especialidad-vs-cafe-normal');
const { porQueMiCafeSabeAmargo } = require('./por-que-mi-cafe-sabe-amargo');
const {
  valeLaPenaPagarMasPorCafeDeEspecialidad,
} = require('./vale-la-pena-pagar-mas-por-cafe-de-especialidad');
const {
  cafeDeEspecialidadCreceEnEspana_2026,
} = require('./cafe-de-especialidad-crece-en-espana-2026');
const { guiaDeMoliendaPorMetodo } = require('./guia-de-molienda-por-metodo');
const { comoElegirElMejorCafeDeEtiopia } = require('./como-elegir-el-mejor-cafe-de-etiopia');
const { mejorCafeSupermercadoEspana } = require('./mejor-cafe-supermercado-espana');
const { mejorCafeMercadona } = require('./mejor-cafe-mercadona');
const { mejorCafeEnGranoCalidadPrecio } = require('./mejor-cafe-en-grano-calidad-precio');

const blogPosts = [
  mejorCafeEnGranoCalidadPrecio,
  mejorCafeMercadona,
  mejorCafeSupermercadoEspana,
  coldBrewEnCasaGuiaCompleta,
  arabicaVsRobusta,
  cafeDeEspecialidadVsCafeNormal,
  porQueMiCafeSabeAmargo,
  valeLaPenaPagarMasPorCafeDeEspecialidad,
  cafeDeEspecialidadCreceEnEspana_2026,
  guiaDeMoliendaPorMetodo,
  comoElegirElMejorCafeDeEtiopia,
];

module.exports = {
  coldBrewEnCasaGuiaCompleta,
  arabicaVsRobusta,
  cafeDeEspecialidadVsCafeNormal,
  porQueMiCafeSabeAmargo,
  valeLaPenaPagarMasPorCafeDeEspecialidad,
  cafeDeEspecialidadCreceEnEspana_2026,
  guiaDeMoliendaPorMetodo,
  comoElegirElMejorCafeDeEtiopia,
  mejorCafeSupermercadoEspana,
  mejorCafeMercadona,
  mejorCafeEnGranoCalidadPrecio,
  blogPosts,
};

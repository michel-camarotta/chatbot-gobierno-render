'use strict';

// Respuestas determinísticas construidas solo desde el catálogo (RF-03).
// Se usan cuando no hay proveedor de IA configurado o cuando este falla:
// el asistente nunca queda fuera de servicio por el proveedor (RNF-05).

function formatFicha(tramite) {
  const lines = [`**${tramite.nombre}**`, '', tramite.descripcion, ''];

  lines.push(`Organismo: ${tramite.organismo}`);
  lines.push(`Modalidad: ${tramite.modalidad}`);
  if (tramite.costo) lines.push(`Costo: ${tramite.costo}`);
  if (tramite.plazoEstimado) lines.push(`Plazo estimado: ${tramite.plazoEstimado}`);

  lines.push('', 'Requisitos:');
  for (const requisito of tramite.requisitos) lines.push(`• ${requisito}`);

  if (tramite.documentacion && tramite.documentacion.length > 0) {
    lines.push('', 'Documentación:');
    for (const doc of tramite.documentacion) lines.push(`• ${doc}`);
  }

  lines.push('', 'Pasos a seguir:');
  tramite.pasos.forEach((paso, i) => lines.push(`${i + 1}. ${paso}`));

  if (tramite.lugar) {
    const { nombre, direccion, horario, contacto } = tramite.lugar;
    lines.push('', 'Dónde se realiza:');
    if (nombre) lines.push(`• ${nombre}`);
    if (direccion) lines.push(`• Dirección: ${direccion}`);
    if (horario) lines.push(`• Horario: ${horario}`);
    if (contacto) lines.push(`• Contacto: ${contacto}`);
  }

  if (tramite.enlaceOficial) {
    lines.push('', `Más información: ${tramite.enlaceOficial}`);
  }

  return lines.join('\n');
}

function noResultsReply() {
  return [
    'No encontré información sobre ese trámite en mi base de conocimiento.',
    '',
    'Te sugiero consultar los canales oficiales:',
    '• Portal de trámites del Estado: https://www.gub.uy/tramites',
    '• Atención telefónica del organismo correspondiente',
    '',
    'También podés preguntarme de otra forma (por ejemplo: "habilitación comercial", "cédula de identidad", "licencia de conducir").',
  ].join('\n');
}

function catalogAnswer(results) {
  if (results.length === 0) {
    return noResultsReply();
  }

  const [best, ...rest] = results;
  let reply = formatFicha(best.tramite);

  if (rest.length > 0) {
    const otros = rest.map(({ tramite }) => `• ${tramite.nombre}`).join('\n');
    reply += `\n\nOtros trámites que podrían interesarte:\n${otros}`;
  }

  return reply;
}

module.exports = { catalogAnswer, formatFicha, noResultsReply };

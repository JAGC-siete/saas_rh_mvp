const { DateTime } = require('luxon');

class AttendanceService {
  constructor(repository) {
    this.repository = repository;
  }

  async registerAttendance(last5, justification) {
    const now = DateTime.now().setZone('America/Tegucigalpa');
    const horaActual = now.toFormat('HH:mm');
    const fechaHoy = now.toISODate();

    const empleado = await this.repository.findEmployeeByLast5(last5);
    if (!empleado) {
      return { status: 404, message: 'Empleado no encontrado.' };
    }

    const asistencia = await this.repository.getAttendanceForDate(last5, fechaHoy);

    if (!asistencia || !asistencia.check_in) {
      const horaEsperada = empleado.checkin_time;
      if (!horaEsperada) {
        return { status: 500, message: 'Empleado sin hora de entrada asignada.' };
      }

      const [h1, m1] = horaActual.split(':').map(Number);
      const [h2, m2] = horaEsperada.split(':').map(Number);
      const diferencia = (h1 * 60 + m1) - (h2 * 60 + m2);

      if (diferencia > 5 && !justification) {
        return {
          status: 422,
          requireJustification: true,
          message: '⏰ Llegaste tarde. ¿Qué sucedió? Por favor justifica tu demora.'
        };
      }

      const mensaje = diferencia <= -5
        ? '🎉 Felicidades, eres un empleado ejemplar.'
        : diferencia > 5
          ? '📝 Asistencia registrada con justificación.'
          : '✅ Asistencia registrada a tiempo.';

      await this.repository.insertCheckIn(last5, fechaHoy, horaActual, justification || null);
      return { status: 200, message: mensaje };
    }

    if (!asistencia.check_out) {
      const horaEsperada = empleado.checkout_time;
      if (!horaEsperada) {
        return { status: 500, message: 'Empleado sin hora de salida asignada.' };
      }

      const [h1, m1] = horaActual.split(':').map(Number);
      const [h2, m2] = horaEsperada.split(':').map(Number);
      const diferencia = (h1 * 60 + m1) - (h2 * 60 + m2);

      const mensaje = diferencia < -5
        ? '🔄 Salida anticipada registrada.'
        : diferencia > 5
          ? '⏱️ Salida tardía registrada.'
          : '✅ Salida registrada correctamente.';

      await this.repository.updateCheckOut(last5, fechaHoy, horaActual);
      return { status: 200, message: mensaje };
    }

    return { status: 200, message: '📌 Ya registraste entrada y salida hoy.' };
  }
}

module.exports = AttendanceService;

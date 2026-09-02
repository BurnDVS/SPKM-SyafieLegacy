function testWA() {
  var nombor = PropertiesService.getScriptProperties().getProperty('TEST_WA_NUMBER');
  if (!nombor) throw new Error('TEST_WA_NUMBER Script Property diperlukan untuk ujian editor.');
  var mesej = 'Assalamualaikum, ini adalah mesej ujian dari sistem SPKM. Sila abaikan. Terima kasih.';

  return hantarWhatsApp(nombor, mesej);
}

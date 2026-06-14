function testWA() {
  var nombor = '0172875136'; // tukar kepada nombor kau
  var mesej  = 'Assalamualaikum, ini adalah mesej ujian dari sistem SPKM. Sila abaikan. Terima kasih.';
  
  var result = hantarWhatsApp(nombor, mesej);
  Logger.log('Result: ' + result);
}
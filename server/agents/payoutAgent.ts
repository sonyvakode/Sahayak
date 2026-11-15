import {
  calculateGroupPayouts,
  type PayoutCalculationSummary,
  type PayoutLineInput,
} from '../services/deterministicMath.ts';
import {
  textToSpeechService,
  type SupportedLanguage,
  type TextToSpeechResult,
} from '../services/speechInterface.ts';

export function buildMemberAudioScript(params: {
  memberName: string;
  orderId: string;
  productName: string;
  completedPieces?: number;
  acceptedPieces: number;
  ratePerPiece: number;
  grossEarnings: number;
  approvalStatus: string;
  language: SupportedLanguage;
}): string {
  const {
    memberName,
    orderId,
    productName,
    completedPieces,
    acceptedPieces,
    ratePerPiece,
    grossEarnings,
    approvalStatus,
    language,
  } = params;
  const completedCount = completedPieces ?? acceptedPieces;
  const statusEn =
    approvalStatus === 'approved_by_group' ? 'approved by the group' : 'pending group approval';

  if (language === 'te') {
    const statusTe =
      approvalStatus === 'approved_by_group'
        ? 'గ్రూప్ ఆమోదం పూర్తయింది'
        : 'గ్రూప్ ఆమోదం కోసం వేచి ఉంది';
    return `నమస్కారం ${memberName} గారు. మీరు ${completedCount} ${productName} పూర్తి చేశారు. వీటిలో ${acceptedPieces} ముక్కలు నాణ్యత ఆమోదం పొందాయి. ఒక్కో ముక్కకు ${ratePerPiece} రూపాయల చొప్పున ఆర్డర్ ${orderId} కోసం మీ మొత్తం సంపాదన ${grossEarnings.toLocaleString('en-IN')} రూపాయలు. స్థితి: ${statusTe}.`;
  }

  if (language === 'hi') {
    const statusHi =
      approvalStatus === 'approved_by_group'
        ? 'समूह द्वारा स्वीकृत हो चुका है'
        : 'समूह की स्वीकृति के लिए लंबित है';
    return `नमस्ते ${memberName} जी। आपने ${completedCount} ${productName} पूरे किए हैं। इनमें से ${acceptedPieces} पीस स्वीकार किए गए हैं। प्रति पीस ${ratePerPiece} रुपये की दर से ऑर्डर ${orderId} के लिए आपकी कुल कमाई ${grossEarnings.toLocaleString('en-IN')} रुपये है। स्थिति: ${statusHi}।`;
  }

  if (language === 'kn') {
    const statusKn =
      approvalStatus === 'approved_by_group'
        ? 'ಗುಂಪಿನ ಅನುಮೋದನೆ ಪೂರ್ಣಗೊಂಡಿದೆ'
        : 'ಗುಂಪಿನ ಅನುಮೋದನೆಗೆ ಬಾಕಿ ಇದೆ';
    return `ನಮಸ್ಕಾರ ${memberName} ಅವರೇ. ನೀವು ${completedCount} ${productName} ಪೂರ್ಣಗೊಳಿಸಿದ್ದೀರಿ. ಇವುಗಳಲ್ಲಿ ${acceptedPieces} ತುಣುಕುಗಳು ಅಂಗೀಕರಿಸಲ್ಪಟ್ಟಿವೆ. ಪ್ರತಿ ತುಣುಕಿಗೆ ${ratePerPiece} ರೂಪಾಯಿ ದರದಲ್ಲಿ ಆರ್ಡರ್ ${orderId} ಗಾಗಿ ನಿಮ್ಮ ಒಟ್ಟು ಗಳಿಕೆ ${grossEarnings.toLocaleString('en-IN')} ರೂಪಾಯಿ ಆಗಿದೆ. ಸ್ಥಿತಿ: ${statusKn}.`;
  }

  return `Hello ${memberName}. You have completed ${completedCount} ${productName.toLowerCase()}. Out of these, ${acceptedPieces} pieces have been accepted. Your payment rate is ${ratePerPiece} rupees per piece. Your total earnings are ${grossEarnings.toLocaleString('en-IN')} rupees. Status: ${statusEn}.`;
}

export async function runPayoutAgentCalculation(items: PayoutLineInput[]): Promise<PayoutCalculationSummary> {
  return calculateGroupPayouts(items);
}

export async function runPayoutAudioSummary(params: {
  memberName: string;
  orderId: string;
  productName: string;
  completedPieces?: number;
  acceptedPieces: number;
  ratePerPiece: number;
  grossEarnings: number;
  approvalStatus: string;
  language: SupportedLanguage;
}): Promise<TextToSpeechResult> {
  const scriptText = buildMemberAudioScript(params);
  return textToSpeechService.synthesize(scriptText, params.language);
}

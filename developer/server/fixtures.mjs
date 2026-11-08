// Local demo fixtures only. Never used by Firebase-mode catalog endpoints.
export const catalog = {
 text:[{id:'demo_text_001',type:'mantra',label:'Text structure example',original_text:'[Original text]',transliteration:'[Transliteration]',translation:null,meaning:null,source_reference:null,language:null,audio_id:'demo_audio_001',demo:true}],
 audio:[{id:'demo_audio_001',type:'audio',label:'Linked recording structure',content_id:'demo_text_001',recording_url:null,language:null,source_reference:null,demo:true}],
 books:[{id:'demo_book_001',type:'shastra',label:'Book structure example',title:'[Book title]',language:null,source_reference:null,chapters:[{number:1,verses:[{number:1,original_text:'[Verse text]',translation:null,source_reference:null},{number:2,original_text:'[Verse text]',translation:null,source_reference:null}]}],demo:true}],
};

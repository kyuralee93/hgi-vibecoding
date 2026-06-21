/* =====================================================================
 * docs-reinstatement-patch.js  (시연용 문서 초기화 + 업로드/열람 보정)
 * ---------------------------------------------------------------------
 * app.js / ai-integration.js 다음에 로드되는 마지막 보정 시트입니다.
 * 원본 파일은 수정하지 않으며, 약관·특약 문서관리 동작만 뒤에서 덮어씁니다.
 *
 * 이 버전이 하는 일
 *  1) 기존에 박혀 있던 문서(기본제공 8건 + 과거 예시)를 "최초 1회" 전부 비우고,
 *     시연용 예시 문서 4건만 등록합니다. (요약·번역이 바로 되도록 본문 text 포함,
 *     각 예시는 실제 PDF 파일이 assets/docs/ 에 연결되어 목록에서 열람 가능)
 *  2) app.js 의 seedBaseDocs() 가 화면 진입·로드 때마다 기본제공 문서를 다시
 *     끼워넣는 동작을 차단합니다. (기간계 비연동이라 복원 불필요)
 *  3) 문서 등록(registerDoc)·선택삭제(deleteSelectedDocs)·목록 렌더링을 패치가
 *     직접 처리합니다. → 업로드한 PDF가 즉시 목록에 뜨고("내 업로드"), 본문 텍스트가
 *     추출되어 요약·번역 대상으로 선택되며, 업로드한 PDF도 그 자리에서 열람 가능.
 *
 *  ※ 시연 전 목록을 깨끗한 초기 상태로 되돌리려면 브라우저 콘솔에서
 *        resetDemoDocs()
 *     를 실행하면 됩니다. (예시 4건으로 즉시 리셋)
 *
 *  ※ 예시 PDF 4개는 index.html 과 같은 위치 기준 assets/docs/ 폴더에 두어야
 *     목록의 'PDF' 링크가 열립니다. (파일명은 SEED_DOCS 의 file 값과 동일)
 *
 * 문제가 생기면 이 파일과 index.html의 <script ...patch.js> 한 줄만 지우면
 * 원래대로 복구됩니다.
 * ===================================================================== */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function pad3(n) { n = String(n); while (n.length < 3) n = '0' + n; return n; }

  var SEED_FLAG = 'gra_seed_example_docs_v4';

  // ---- 예시 PDF 내장(base64) → 런타임 Blob URL (서버에 파일 둘 필요 없음) ----
  var PDF_B64 = {
    'EX-DOC-001': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagozIDAgb2JqCjw8Ci9CYXNlRm9udCAvSFlTTXllb25nSm8tTWVkaXVtIC9EZXNjZW5kYW50Rm9udHMgWyA8PAovQmFzZUZvbnQgL0hZU015ZW9uZ0pvLU1lZGl1bSAvQ0lEU3lzdGVtSW5mbyA8PAovT3JkZXJpbmcgKEtvcmVhMSkgL1JlZ2lzdHJ5IChBZG9iZSkgL1N1cHBsZW1lbnQgMQo+PiAvRFcgMTAwMCAvRm9udERlc2NyaXB0b3IgPDwKL0FzY2VudCA3NTIgL0F2Z1dpZHRoIDUwMCAvQ2FwSGVpZ2h0IDczNyAvRGVzY2VudCAtMjcxIC9GbGFncyA2IC9Gb250QkJveCBbIDAgLTE0OCAxMDAxIDg4MCBdIAogIC9Gb250TmFtZSAvSFlTTXllb25nSm8tTWVkaXVtIC9JdGFsaWNBbmdsZSAwIC9MZWFkaW5nIDE0OCAvTWF4V2lkdGggMTAwMCAvTWlzc2luZ1dpZHRoIDUwMCAvU3RlbUggOTEgCiAgL1N0ZW1WIDU4IC9UeXBlIC9Gb250RGVzY3JpcHRvciAvWEhlaWdodCA1NTMKPj4gL1N1YnR5cGUgL0NJREZvbnRUeXBlMiAvVHlwZSAvRm9udCAKICAvVyBbIDEgWyAzMzMgNDE2IF0gMyBbIDQxNiA4MzMgNjI1IDkxNiA4MzMgMjUwIDUwMCBdIDEwIDExIDUwMCAxMiBbIDgzMyAyOTEgODMzIDI5MSAzNzUgNjI1IF0gMTggCiAgMjYgNjI1IDI3IDI4IDMzMyAyOSAzMCA4MzMgMzEgWyA5MTYgNTAwIDEwMDAgNzkxIDcwOCBdIAogIDM2IFsgNzA4IDc1MCA3MDggNjY2IDc1MCA3OTEgMzc1IDUwMCA3OTEgNjY2IAogIDkxNiA3OTEgNzUwIDY2NiA3NTAgNzA4IDY2NiA3OTEgXSA1NCBbIDc5MSA3NTAgMTAwMCA3MDggXSA1OCBbIDcwOCA2NjYgNTAwIDM3NSA1MDAgXSA2MyA2NCA1MDAgNjUgCiAgWyAzMzMgNTQxIDU4MyA1NDEgNTgzIF0gNzAgWyA1ODMgMzc1IDU4MyBdIDczIFsgNTgzIDI5MSAzMzMgNTgzIDI5MSA4NzUgNTgzIF0gODAgODIgNTgzIDgzIFsgNDU4IDU0MSAzNzUgNTgzIF0gCiAgODcgWyA1ODMgODMzIDYyNSBdIDkwIFsgNjI1IDUwMCA1ODMgXSA5MyA5NCA1ODMgOTUgWyA3NTAgXSBdCj4+IF0gL0VuY29kaW5nIC9VbmlLUy1VQ1MyLUggL05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMCAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAovQ29udGVudHMgOCAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCA3IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgNyAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDYyMDE2MDA0MiswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDYyMDE2MDA0MiswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoXDM3NlwzNzdcMzI1dFwzMDZ4XDMwMlwwMzBcMzA3XDI1NFwwMDAgXDAwMFBcMDAwYVwwMDBjXDAwMGtcMDAwYVwwMDBnXDAwMGVcMDAwIFwyNzRcMzY0XDMyNVwzMzBcMDAwIFwyNzRcMzY0XDMyMVwyNjVcMzA1fVwyNTVcMDAwXDAwMCBcMDAwXChcMjc0XDAzNFwzMTVcMzE0XDAwMFwpKSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyA0IDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKOCAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxNDgxCj4+CnN0cmVhbQpHYXVITDk5N2pkJSkxJmtkJVE0ZCYkQUlnaUJkL0snXGFCLztQNmJJT0ZvMlBPOVUsTE9WVi9DJic5O1M4TmVWTW0kWlAoI1N1Rzw+O0BYVnI6bCtQMFVEYChZQWBpZnE+K2Q9cUEnTDQzVzxqMSVGLHIjUXVBInM1QmkzJXFEX1RRSjBtYCY0RiwhOW5hSE1hNHJoZHMobkNtZjpkamFeay0mdGpbTChJbiluXVlzQlleWyxLL2N1aW1qQ0dPNUVRQmNJKTNwZmptUDE2YFE7OyFqUlJxLj9IX0dpPl5pYF9uKVgkdGMvWjMqJ1YoUFtMbEVyLF9NIUlGWFQtQT1dbzYiYGRwRDM/aWQmPVw1V3FuPVNzXFFBazRrY1xuZyIxOmlTbzlEJGkpSVwxNHQzSFlUblhZIU1fbHFLYShuRzM9SDMkLmFXOEpwJmBFSl8oJTMuKTNPUzcwWjRzO3BOSVNnTkBTTVglXCRqMlhQLS9UPSUpPT8nLks7dXEiJmxzI3FzJ0pyTGsicE4jUj08OClnI3FidGpoay45PyZAJz5mIlgoaGFkcnAnOWwjSjk6cSFkQlJgPSVaMERDWkVTXG09PlM1XEAxNzJKXj5YZmVhOWw1ciJGSitEaWUxRElfWCdVWVImbmZaY11RVi9vVlYsZ0hZTFQnIV1FQU8nOlc9Zms/KXVxX2Qhcm8+WnA5SikmbHFKJlg7KEpcN0ZFdDYsJ20wPiUlKSI+cSg5RW5hQy5oQmNcSSg/UlQ9YixYQjlLNjRYL2ZwZVk6VXBQISJVXEA2U0pVQ0xWQHFkQyolUzs6TWQ7ZCJYIjQnZ045TSVAaV8tZl1IRy9EKltpTSQzYi9fQWZ1YmQ0WSI3MU1vXVxSJnM0cTlzIVArYC9mJW1sZUwvbU1KU1FZVzdFRSRvRD5QQEdtdEJGUGg0QFUvWm5aOSRXLXNzQWFrT0NnRyk4JC4sJmEhNjhqP24kNltkQVAjQkxKVGpdNkA/UFVJaVBtUU04QSFRKW4uU2dKRjlCUSdNOz42S1clK2dFJmIyWGwzNko2S21bT05gaEBoQHFIQXBBSV8vMlxjVmUidDJlIW9jOEtjQl5XaVJsMGsyWi09YmFQdDdNbSMqckBOMFdZKDMtMF5lclZfPG1APjljM11wVVYqVihUa0ZQJiI1YG06YytwXS03YDhPOTZKZTEiXkJTYHAvS0UqMnRLZW8rX2U1bz5OXScwJm4jXENbciRMLEQ7blpTVF5gSlpCam1tVDtKN2ZkZGVERmJXOldDPyw5bSMjNicuVjFfT3RUbiJJUSNJaFIoTU9XZyohTVUkMiVsayZvQG4yT0ovRVwucmhba3U/MTNZI3BURDtRTjxIVEhwSjhUKHFmM1JjRyJZblg+LiMrI1NtWTllKVJrZz81aVk4ZmE1Y1ljQVAvUHBaVDo3SG8sLmNXN2hqYCpaVFo9M0FoVUJdP2RFMFNxVmg7aFc1dWVfPVxtZFlhQjVYJTgoVW4oKi00cVtMOXM8aGtzblpWK1NEXVkwdCliUkgtU2xUNDB1RF88KkNNIzBpS25bKCgoR1VxdUVQRW9lTVBiYkJ0a0pfNUg8Qz9Xa3I9cis8I2JHPlpCakZTIjUoKEJARUYmQkY6b2gyISgqKC80ImdhQiJQdUQ1TiIsUmZoW0xBVTJvJFZpZW5RJ2hBWSpFQ2kmISxZZ1YwLzpdUWtsZ1FnNzhgbitXV2ExSk48LVBmVTRiNlMyb1ZDbCUhQF9xNlloIVRlVF84TmZRREdINXAvZGYsaWNWMDFTRzckN1ZKIV1tNzIqMHRQai05WTZMYF1jUHBkXGxMRTk8MiZFJyFja0srZF04InU8XCdBZSFCImAiYTBXX0BEYjU9azA4ZG0sJic3QmdGIkEzUiM/Pj8pbzMzPyVTTnUyYFAwS0tkaCFDMkE6ZyxzNklLalBmRC1hQmZtL0AvaidpRT9+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDkKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMDIgMDAwMDAgbiAKMDAwMDAwMDIwOSAwMDAwMCBuIAowMDAwMDAxMjQ4IDAwMDAwIG4gCjAwMDAwMDE0NTEgMDAwMDAgbiAKMDAwMDAwMTUxOSAwMDAwMCBuIAowMDAwMDAxOTQ4IDAwMDAwIG4gCjAwMDAwMDIwMDcgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8MTU0YTAxMGZjNTI2M2RkODkxMzUzY2Y0ZThhYzcyNTQ+PDE1NGEwMTBmYzUyNjNkZDg5MTM1M2NmNGU4YWM3MjU0Pl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyA2IDAgUgovUm9vdCA1IDAgUgovU2l6ZSA5Cj4+CnN0YXJ0eHJlZgozNTc5CiUlRU9GCg==',
    'EX-DOC-002': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9aYXBmRGluZ2JhdHMgL05hbWUgL0YzIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNSAwIG9iago8PAovQ29udGVudHMgOSAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCA4IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgOCAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDYyMDE2MDA0MiswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDYyMDE2MDA0MiswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoUHJvcGVydHkgUmlzayBFeGNlc3Mgb2YgTG9zcyBSZWluc3VyYW5jZSkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMTI2OQo+PgpzdHJlYW0KR2IhJEU7MDFfVCZCRV0iLkpBbUdXIjdSSUQ+S1JZYT5JZlE7UDgqdSRub0k1VFNrQ0NQJ2hxJGhqJy0wOFJWW2tBdTxIa2BxRjBBXlY9J1YrT0oiOkVXPUpoaThZTThnXyhfbjlHXXJcMDgvUlElJlsxYVkvbm5PYGE2dCUrczVnM0dWbCc6WS9BajRuSGszT2k7JWdBOz9DLzlxX1tZbD4kZG11ZFk6JkMiYnVNdDpgI2pFIio+U2FcYFYlTkA0XyRhJSVnSiQyM1xLWTBDXypjNkwlL3RSSVktXElZSSJzPG1nQzIzTXFcXjZXRi9IT3NnO2AsbE9bLmkmLUFoUi9USFFpNmJeRUpcRzFuJF80SENSXHVuPCZ1TE9CZUcjZT1SPzEoL0ZmXC1BMlJAMWRxLCVRbUdZcShNJ0psSkpCPzFMViIuOTlNcSJNcydMdVpmX2RXbTVgOUYvQCwha2NXYEVtZkBJXCpmOnJwYi5RVzZUdT9KXDhXS0w/OUBFdSU0MEhvbDUjNkFxTWUiK190IUBQKHVKJjpMI0pZVmlGRSJiPklZZDZGWmQ8YFIvQVxRR28tdEs4IWxDSyNDIW9sKzVrPVVyOTxZLlpoSEFaLiNLVm5NWmNlU11ocTdwM0NnRFlrQDo/QlssIVZnXk43QiNnJUEscD5tVXMhOT5ybmxoTExcKjA7TVxVWS8uMmFkdVFWRDdCLCgrLlE9KTBMNGVPa0VuZHF0Km5eNVxdRW9sMC4nQmhdTjl0Vj0vWyVHSjtrXHNUMlBuUiZOUT8+XHBpRG0qWTInTGY4c2lMWiQkTiFXUD9DKy5xVHRbRkNjZ0ltZ2d0Xj8+PGZpbC9OMXBaQ2pmaltPOTFVYCt1O2ImLS5bPjgkbC5wMkBYL0gpJV81dGc+Xjc1O0JCZFJMajYxXlFecFAlKSRmNm8nUVc2cFhuMU5wPnJtYkk6VjZlOTQrajtbTVRUKEpBTnBuPCJuWjRkMC1gLWo7PSklLk5jTiY3JVBjUVJuUUJwVGtnXUIiSzh0JSptPnQzLWo8YlwmPUhzPEBdK2ddPVU4NilJMU8xQC5pMVhEQWBWN0RAXzAzZzpBLF85TnBZVE9mSTs3bUg/IVIvJ2A0J3EySytsRyZtL21iVSxJVWcwOF9nUzRcQ0FqZ2oyV1MzQz9CaE01T25HIiNjWUh0TmlRYCdJZW4hXCs9ViJpQ2RfT0FYXS43Vjg8KiR1LlgpbEVVaElpPTI9T3MrZiRGZGhvYS0oRkQ8PykzYE0oZF1MMmJNT2suPzkwKmkpRkgzNVMxMTIuSU1KUTxecUsiWV09KDprMVNcLmRQcmU4bU4xZT5dZGJVUCJjTCNFWmBZTkdVPyR0OGNCTUlbWDRZbF0vS2AhU108SiIlLkQpJ2Q3Zz0jdCspclFEOnA4J2BpMFEmSSghQSluZDBxcnRbUllgbUdAPiI9YVUyPUtbQD1gNEo4aTxgR2d1dWs8YzRoViMzUlJ1JUBGS29XTVlxdVl1UyNSO09sImE7SjFQKD8+Z0AvMlEocW1vUmFkZj9LKTQ+N21vcihVSWZNJS4zSSFwVSZUMWBsU1I2LWEuLThvKylaX0tnSjVGTD81W2xucFtqYFFdWmc0LWYtZnB1TW5JZU9CYEYnXHBHQEEkbDJSTjFTZ3MhKiUwXWdfIjE5SWAoQn4+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMTIgMDAwMDAgbiAKMDAwMDAwMDIxOSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0MTQgMDAwMDAgbiAKMDAwMDAwMDYxNyAwMDAwMCBuIAowMDAwMDAwNjg1IDAwMDAwIG4gCjAwMDAwMDA5OTIgMDAwMDAgbiAKMDAwMDAwMTA1MSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzxhZjg2Zjk5NjQ1OTM0NjdkOGFjZTc3YjkxMzg4ZWM1ZD48YWY4NmY5OTY0NTkzNDY3ZDhhY2U3N2I5MTM4OGVjNWQ+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDcgMCBSCi9Sb290IDYgMCBSCi9TaXplIDEwCj4+CnN0YXJ0eHJlZgoyNDExCiUlRU9GCg==',
    'EX-DOC-003': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9aYXBmRGluZ2JhdHMgL05hbWUgL0YzIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNSAwIG9iago8PAovQ29udGVudHMgOSAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCA4IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgOCAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDYyMDE2MDA0MiswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDYyMDE2MDA0MiswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoRmFjdWx0YXRpdmUgUHJvcGVydHkgUGxhY2VtZW50IFNsaXAgLSBJbmRvbmVzaWEgUGV0cm9jaGVtaWNhbCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMTQxMAo+PgpzdHJlYW0KR2IhI1poZklkOCY6VnI0WXFOZkwzaDEhPXBdbm5TRU9fO0szI1w9REY9Jll1L08xK1ZpWnBNanMqW3NsaVhkSERkKWpPUzQ5alBEbT0rcyJbcWNYcm5LQExDPFdcZWhuQjVHR2AuTi40ViElQG0qUSdRb3Ewa1olLzspI2A0WzhRXU1NTXJANW5FX0taOXBfZUtSSWYlMEJyXUQqJ2EiRz82QFxmIkZaRmskcCNwb0tFaWQkNmhHNUdjPWBTR0txWDdZMVJLVyVCJCtwdDxtWmVqOUdqLTVIanVdVSxdWT8kanFNRk8uJS4yPmFZUitKS18tNFo1P2pNKWk6LlQ0K1A7O0IkQk9XWSgocCdnJVwlZSVXSVsnWSZCOkNTOjY1JDcyb2JrV29WKT9XSlBNLW1Kc0xOI2h1ZktOUk5qU0kmLk1SPD1yVCd0Z2lTOjMpLGs8bG8rPmxRMFMwWzU4dGg2PUc1Mi1qXWw0PztKSG46anBHLjBpbFxWUSdQZ0c8cFkvV1peJ0pTRzFoTihrN0RdPHIpLypuR3AobSEyKio6ZTkoIiIudFlOJS9rPTdScGxjaj9bZkw6J14lSWNRUU8mOCg3OyxlUjRnU0A1XS9QX29aa2RfTCtKN0BAX1c8Vic6RFlASFpOLiUpX1QwKjA/UDk4WWhoNTQsJU9iLmBSMUYnR1ZKZlxObUFBJ2prdUlNakhnOTcwLUlwaGU/MzlKbkglXCt0S1tgTV47JjFbX2c4PCMwbXNZR0lgKTQyVzxpQzNwLl5tWSpvblE3bkchWFZaSVRVJEY6RU5GXldJJl9HTztlWFlkMVg3RCFNMW4jLyFkZDVIc2Q/XzI3cylLMk4sKXFvODczbTJFRDpwNkMnI05qZkBbO1xvTXJROyg3VTA+cGY8NkY/ZWFgOltrYSJBWE0/cVZyW0UvbCovZkxCbUhmdVNaKWhFUjZBYFk9YywwRmchVzYqbyJEOl9NTSgvdXJGYFQnTSk8LGtzIkskWUppUCNFaFwuLUYxbEY+Z0cmQzg+WC41az5oPU8rMyY4TFdZXG41aWtYcm1ETEZRImU6cz0+VF0oUGZuZSptQVY6UDtEbkIlIVQoUjZjW15HM1xZXFVmQk5YY2ZkX1tlPGEuRDQlXnRsSSJLVS5aZm5zXXFVQkFOXkw7QSM7LkpzPDQiVzhrVEtHVi1ROzBiP0Q9J2JjMDIjR2gtWy1KbGlwI2k/LSk5bU0wUk43Q0tfUjFAVTxXI2hcSFgyZmtsLyxQMUwtXVZMVypZWm09OydfIVooIidNLlFDU2YtbVctN1k9NSFRL29Zb2NeRjNyayNKITg8SXRPOChZWkZYJlFQJTEjTTUraTpUWlhCYGBaYidVWExlQj9hcilPXl1MbzltJDM6I1M1XmxecEZJW01BcEI4UUJrYURoNDZoZXAxIm8lYnEwOTw/am82UkchRFEsOmsxMUI7LG9KSEBwWDFTMmBEdWNYWWArbFxgRlMxNU5fVSgoRT8pIlRMXzlTJVxVI1duJUM2Im9CUSNnNl9zSXRUaUhxWSk8NUxCUyZEQkZbWzUtOzliU2B0R0NdKCRjU2YnMmVBSC9yJTQkMWExMXMkYTghTCshXGhgKlEnSDQ9L0cnWmBmQmZYWz1dSlMxOHJOPz9HVkFLdVYpOTlUZG5uLUM0a3NLPCxNM0NgdTREVF0zOmIzIVc9KkY2SldhYFZlVGRrOzlhW2BXJXBIPEopY09XLGAvV1NVL05mU1wzcFtKLWpqYVpgI2MtQFNfL2pyckdKTVxIPXJxOjMsT2tic28jRy5PVGZTXF5qTylyIlRoRHJganJCUF1PMWRCRmRMSTIiXydtKmVTRzheZmByV1dKLT1zIX4+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMTIgMDAwMDAgbiAKMDAwMDAwMDIxOSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0MTQgMDAwMDAgbiAKMDAwMDAwMDYxNyAwMDAwMCBuIAowMDAwMDAwNjg1IDAwMDAwIG4gCjAwMDAwMDEwMTMgMDAwMDAgbiAKMDAwMDAwMTA3MiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzw0ODdmYmZkOGYwODcyOTQ3ZGVlMDQ2M2JhNDI2NjVkNz48NDg3ZmJmZDhmMDg3Mjk0N2RlZTA0NjNiYTQyNjY1ZDc+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDcgMCBSCi9Sb290IDYgMCBSCi9TaXplIDEwCj4+CnN0YXJ0eHJlZgoyNTczCiUlRU9GCg==',
    'EX-DOC-004': 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9aYXBmRGluZ2JhdHMgL05hbWUgL0YzIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNSAwIG9iago8PAovQ29udGVudHMgOSAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCA4IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgOCAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDYyMDE2MDA0MiswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDYyMDE2MDA0MiswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoV2FyIGFuZCBUZXJyb3Jpc20gRXhjbHVzaW9uIEVuZG9yc2VtZW50KSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjggMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyA1IDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKOSAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxMzA0Cj4+CnN0cmVhbQpHYiEjWjlsbztgJkFAc0JvRlwiKlhPL3U7M0dZLipDNWluUmYma282KzpVIkRCZ3QwLzYyXjMjNFRiUGRBY2pLIzxKbihqMXAtMnRuJUVGbEpXQ284cllJSC0wMCo6bzBPT3FCJFhmKTU2MmhKOXE6WEBVW1otNUVjT1tsPEoyQ2hEKjYmVElMWUVqWD1JYj5jJFxDM20pMGZSLmA2ZWs3bmRLVEZJMlBeXEB1MTFmbHEzNThedS4iLV5mOl1PMExkIXFDRGQoVzwxVDpYXyx1dVY9QV1JVlNqV0pcbnQtMzcrOEMqaDwjZSstJ3VpaDJLXSM6OFBrWixGQjFcMyloZ2MnSVw7LyUyalJwI0xMTUxwUydvWjYhUWYqPSRKUVgzKU0tL1xFSi5SRUtnNHNgbyNhLG4pN0JNaGwlO3VqTyZQL1xYKSxeWVhyOzVrKE5STTdcUGZsbGpQVkx0PDY8bUpENC4mMypwWl5RRiNbWVs6LD1QXnFcVC9hPD5KOFw0RyFuKEJsVjNRNyQ9NkhjQzJzZFpHV05PMWhUa09zcjkmaXJUNFlTLCcsWE5KbiMqTV5oMD4rIyJqREU7SiUzSlRoUzQscixnIzlmWjExMSgtYkEtVEclRm5NUlQpcWVnYG5YRllHRiRZWC5gZiouJ3U7UWMvVEA6ZFhrSCwxTChYciJCaSNFKCtPMWcmNSQ6I1YmM1tTRCpdLHJETTU8KWZAP09ZN01LXzQ4Ois4JTxzQSZvLXQvLzNOTmNePSZzLmdwRldYLTgnaC9mWV8/cTYiTDNTLWskMClTQWQ5PW0pPUQvcj87THFaPVFHTy4rQVFLLi08akpRWzpycCZHcUBsRUM3OS1sPFhzTEQrSmxRVERhLFprMmxPQUddb0w5Wz5wdCNFVGtKcThUcmUkaVdVSy47VkhzVHMoVV1QS2JvNl1vXjxlK0csWmtNY21ERV5wVCxyXUJdWEhTOUcxcUxhIjxJLD4jSDA4ciNVKi4+JypZWkxXPEhcJT1uWzAlW2wuMVU9aV9HKE4zKGVjXkljJzErSzMvRlBLPEVTUidHM1UxTG82KWdOSThWUWU6SzNfaCcnN2lCWigjN2xNPFZWP1lpYDM+dU1RUmE0TFkmP0c7ISw+M18hRCkiKmMuS1gmM2pRVVowLmpgVDs5S2dxOVgkWFNyPlEhP3I7PWlZTTJGSlk+MlpicF1nQSEqZTEoN242OWhqJFw0VWZwYTIpSDswYmY+OHJmL2hzKFRAQ21ndD9ISWZrPlI1NS07MkQnSC50aVFPaTcnV2knYzFwdHI6TWpeY3BcIWU0ZUVNPjJMOj85TkJrUDVQTFVGITswSjNRTFg8K0RYbEg2QjVCbjxCQ1dATiovbXM8Z09XOiVESF9dOzRyV05oUGNDb0pdTkxYJVRRRT45dUdaZFl1UDtrS1xRYiIpU2YhWWhiLkFDJFk+ODBTKCdvZXIzSHA0Nz1yMDFjdCdEUWI6LlcsImdwa0dualxeNmxzaDtrXEs4XSNbRC4tRmV1WUplZlxLMiRCVjBRX1xEYVM5ckclKzQlXjc9LV1Db3BwZ25yOlNRWV1SKGtvMUh1aV9pKzUxayNNPT9ncUpoZ2xyXklJWF9wZ3BMZVMqITlrL18oJGsyZj40SG9eRTpjYDxdPkNwMVIxPE1yOVhRTU5rWkc+YFUxUnNRNTY1O04ubDZOOCw2SDpaSWMnKlFWWyFXRDIiWVF+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDEwCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTEyIDAwMDAwIG4gCjAwMDAwMDAyMTkgMDAwMDAgbiAKMDAwMDAwMDMzMSAwMDAwMCBuIAowMDAwMDAwNDE0IDAwMDAwIG4gCjAwMDAwMDA2MTcgMDAwMDAgbiAKMDAwMDAwMDY4NSAwMDAwMCBuIAowMDAwMDAwOTkxIDAwMDAwIG4gCjAwMDAwMDEwNTAgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8YTdjNzM4YjMyYmVhZDk5MDZmMmI3YTIxY2YxODBlZTY+PGE3YzczOGIzMmJlYWQ5OTA2ZjJiN2EyMWNmMTgwZWU2Pl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyA3IDAgUgovUm9vdCA2IDAgUgovU2l6ZSAxMAo+PgpzdGFydHhyZWYKMjQ0NQolJUVPRgo='
  };
  var BLOB_URLS = {};
  function b64ToBlob(b64, type) {
    var bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: type || 'application/pdf' });
  }
  function seedBlobUrl(docId) {
    if (!BLOB_URLS[docId]) {
      try { BLOB_URLS[docId] = URL.createObjectURL(b64ToBlob(PDF_B64[docId])); }
      catch (e) { return ''; }
    }
    return BLOB_URLS[docId];
  }

  // ---- 시연용 예시 문서 (text = 요약·번역 대상 본문, file = 열람용 실제 PDF) ----
  var SEED_DOCS = [
    {
      docId: 'EX-DOC-001',
      title: '예시 약관 - 해외수재 Package 보통약관(발췌, 국문)',
      type: '약관',
      keywords: 'Package, 화재, 폭발, 풍수재, 보상하는 손해, 면책, 비례보상',
      file: 'assets/docs/EX-DOC-001_package_policy_ko.pdf',
      fileName: 'EX-DOC-001_package_policy_ko.pdf', sourceType: '사용자등록', indexed: true,
      text:
        '제1조(보상하는 손해) 회사는 보험증권에 기재된 보험의 목적에 아래의 사고로 생긴 직접손해를 이 약관에 따라 보상합니다. ' +
        '1. 화재 2. 폭발 또는 파열 3. 벼락 4. 태풍·홍수 등 풍수재 5. 항공기 또는 그 낙하물에 의한 손해.\n' +
        '제2조(보상하지 않는 손해) 회사는 다음의 사유로 생긴 손해는 보상하지 않습니다. ' +
        '1. 보험계약자 또는 피보험자의 고의나 중대한 과실 2. 시설의 노후화·마모·자연소모 3. 전쟁·내란·폭동·소요 ' +
        '4. 지진 및 분화(특별약관으로 가입한 경우 제외) 5. 핵연료물질로 인한 손해.\n' +
        '제3조(지급보험금의 계산) 지급보험금은 손해액에서 자기부담금을 공제하여 계산하며 보험가입금액을 한도로 합니다. ' +
        '보험가입금액이 보험가액보다 작은 경우에는 그 비율에 따라 비례보상합니다.\n' +
        '제4조(특별약관의 우선) 이 보통약관에 첨부된 특별약관이 보통약관과 다른 경우에는 특별약관을 우선하여 적용합니다.'
    },
    {
      docId: 'EX-DOC-002',
      title: '예시 특약 - Property Risk XL Treaty Wording(발췌, 영문)',
      type: '재보험특약',
      keywords: 'Risk XL, Retention, Limit, Reinstatement, Hours Clause, Exclusion',
      file: 'assets/docs/EX-DOC-002_property_risk_xl_wording.pdf',
      fileName: 'EX-DOC-002_property_risk_xl_wording.pdf', sourceType: '사용자등록', indexed: true,
      text:
        'PROPERTY RISK EXCESS OF LOSS REINSURANCE - SPECIMEN WORDING.\n' +
        'Article 1 (Business Covered): This Agreement indemnifies the Reinsured for the ultimate net loss on Property ' +
        'business in respect of risks situated worldwide, excluding territories specified in the Exclusions Article.\n' +
        'Article 2 (Cover and Retention): The Reinsurers shall be liable for the ultimate net loss each and every risk ' +
        'in excess of the Reinsured retention, subject to the limit each and every risk stated in the Schedule.\n' +
        'Article 3 (Reinstatement): Any amount of the limit exhausted by loss shall be automatically reinstated. ' +
        'The Reinsured shall pay an additional premium at the stated reinstatement rate, pro rata as to the fraction ' +
        'of the limit reinstated and pro rata as to the unexpired period of the Agreement. Reinstatements are limited in number.\n' +
        'Article 4 (Hours Clause): A single Loss Occurrence is limited to 72 consecutive hours for windstorm, typhoon ' +
        'or flood, and 168 consecutive hours for earthquake.\n' +
        'Article 5 (Exclusions): This Agreement excludes wear and tear, gradual deterioration, war, nuclear risks, ' +
        'terrorism unless written back, and cyber incidents.'
    },
    {
      docId: 'EX-DOC-003',
      title: '예시 Slip - Facultative Property Slip / Indonesia Petrochemical(발췌, 영문)',
      type: 'Slip',
      keywords: 'Facultative, Property, Business Interruption, TSI, PPW, Order Hereon, Indonesia',
      file: 'assets/docs/EX-DOC-003_facultative_property_slip_indonesia.pdf',
      fileName: 'EX-DOC-003_facultative_property_slip_indonesia.pdf', sourceType: '사용자등록', indexed: true,
      text:
        'FACULTATIVE REINSURANCE PLACEMENT SLIP - Property Damage and Business Interruption.\n' +
        'Type: Facultative reinsurance of an original Property All Risks policy including Machinery Breakdown and BI. ' +
        'Reinsured (Cedant): PT Asuransi Mitra Nusantara, Jakarta, Indonesia. ' +
        'Original Insured: Nusantara Petrochemical Industries. ' +
        'Situation: petrochemical manufacturing complex, Cilegon, Banten, Indonesia.\n' +
        'Period: 12 months from 1 July 2026 to 30 June 2027. Currency: USD. ' +
        'Total Sum Insured 100%: USD 850,000,000. Estimated Maximum Loss: USD 310,000,000. ' +
        'Order Hereon: 5.00% of 100%. Reinsurance premium for our share: USD 60,350 annual.\n' +
        'Premium Payment Warranty: 60 days from inception. ' +
        'Deductibles: Property Damage USD 2,500,000 each and every loss; Business Interruption 21 days time excess.\n' +
        'Conditions and Wordings: NMA2918 War Exclusion; NMA2962 Terrorism Exclusion with terrorism written back; ' +
        'CL380 Cyber Attack Exclusion; LMA3100 Sanction Limitation Clause; Several Liability NMA1975.\n' +
        'Subjectivities: receipt of the March 2026 risk survey, final Nat Cat modelling output, and satisfactory ' +
        'sanctions and KYC screening. Choice of Law and Jurisdiction: English Law.'
    },
    {
      docId: 'EX-DOC-004',
      title: '예시 특약 - War & Terrorism Exclusion Endorsement(NMA2918/2962, 영문)',
      type: '특약',
      keywords: 'War, Terrorism, Exclusion, NMA2918, NMA2962, Write-back',
      file: 'assets/docs/EX-DOC-004_war_terrorism_exclusion.pdf',
      fileName: 'EX-DOC-004_war_terrorism_exclusion.pdf', sourceType: '사용자등록', indexed: true,
      text:
        'WAR AND TERRORISM EXCLUSION ENDORSEMENT - SPECIMEN.\n' +
        'Notwithstanding any provision to the contrary, this insurance excludes loss, damage, cost or expense directly ' +
        'or indirectly caused by, resulting from or in connection with war, invasion, acts of foreign enemies, ' +
        'hostilities, civil war, rebellion, insurrection or military usurped power (NMA2918).\n' +
        'This insurance also excludes loss, damage, cost or expense directly or indirectly caused by, resulting from ' +
        'or in connection with any act of terrorism, regardless of any other cause contributing concurrently or in ' +
        'any other sequence to the loss (NMA2962).\n' +
        'For the purpose of this endorsement an act of terrorism means an act, including the use of force or violence, ' +
        'of any person or group acting for political, religious or ideological purposes, including the intention to ' +
        'influence any government or to put the public in fear.\n' +
        'Write-back: where specifically agreed and scheduled, physical damage by terrorism may be written back subject ' +
        'to the terms, limits and additional premium stated in the Schedule.\n' +
        'If any portion of this endorsement is found invalid or unenforceable, the remainder shall remain in full force.'
    }
  ];

  // ---- 1) state.docs 초기화 + 예시문서 시드 (DATA.docs 재주입 차단) ----
  function normalizeDocs() {
    if (typeof state === 'undefined' || !state) return;
    state.docs = state.docs || [];
    try { window.seedBaseDocs = function () {}; } catch (e) {}

    var seeded = false;
    try { seeded = localStorage.getItem(SEED_FLAG) === '1'; } catch (e) {}

    if (!seeded) {
      state.docs = SEED_DOCS.map(function (s) { return Object.assign({}, s); });
      try { localStorage.setItem(SEED_FLAG, '1'); } catch (e) {}
    } else {
      // 사용자의 추가/삭제는 보존하되, 혹시 남은 기본제공 문서만 정리
      state.docs = state.docs.filter(function (d) { return d && d.sourceType !== '기본제공'; });
    }
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
  }

  // ---- 시연 리셋용 (콘솔에서 resetDemoDocs() 실행 시 예시 4건으로 즉시 복원) ----
  window.resetDemoDocs = function () {
    if (typeof state === 'undefined' || !state) return;
    state.docs = SEED_DOCS.map(function (s) { return Object.assign({}, s); });
    try { localStorage.setItem(SEED_FLAG, '1'); } catch (e) {}
    try { window.seedBaseDocs = function () {}; } catch (e) {}
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    renderDocsPatched();
    return state.docs.length + '건으로 초기화되었습니다.';
  };

  // ---- 데이터구분 / PDF 셀 표시 ----
  function originLabel(d) {
    if (d && (d.registeredBy || d.registeredAt)) return '<span class="doc-index-ok">내 업로드</span>';
    return '<span class="doc-index-no">예시 등록</span>';
  }
  function fileCell(d) {
    if (!d) return '-';
    // 예시 문서: 패치에 내장된 PDF를 런타임 Blob URL로 연다 (서버 파일 불필요 → 404 방지)
    if (PDF_B64[d.docId]) {
      var u = seedBlobUrl(d.docId);
      if (u) return '<a href="' + u + '" target="_blank" rel="noopener">PDF</a>';
    }
    // 사용자 업로드: 세션 Blob URL
    if (d.fileUrl) return '<a href="' + d.fileUrl + '" target="_blank" rel="noopener">PDF</a>';
    return (d.fileName || (d.text ? '본문 인덱싱' : '')) || '-';
  }

  // ---- 2) 문서 목록 렌더링 (전체 삭제 가능, AI 셀렉트 동기화) ----
  function renderDocsPatched() {
    if (typeof state === 'undefined' || !state) return;
    try { if (typeof setMetaText === 'function') setMetaText(); } catch (e) {}
    var tb = document.querySelector('#docTable tbody');
    if (tb) {
      tb.innerHTML = (state.docs || []).map(function (d) {
        return '<tr>' +
          '<td><input class="doc-check small-check" type="checkbox" value="' + d.docId + '"></td>' +
          '<td>' + d.docId + '</td>' +
          '<td>' + (d.title || '') + '</td>' +
          '<td>' + (d.type || '') + '</td>' +
          '<td>' + (d.keywords || '') + '</td>' +
          '<td>' + fileCell(d) + '</td>' +
          '<td>' + originLabel(d) + '</td>' +
        '</tr>';
      }).join('');
    }
    var sel = document.getElementById('docAiSelect');
    if (sel) {
      var prev = sel.value;
      sel.innerHTML = (state.docs || []).map(function (d) {
        return '<option value="' + d.docId + '">' + (d.title || d.docId) + '</option>';
      }).join('');
      if (prev) {
        var has = (state.docs || []).some(function (d) { return d.docId === prev; });
        if (has) sel.value = prev;
      }
    }
  }

  // ---- 3) 문서 등록 (업로드 PDF → 목록 즉시 반영 + 본문 추출 + 열람링크) ----
  async function registerDocPatched() {
    var titleEl = document.getElementById('docTitle');
    var typeEl = document.getElementById('docType');
    var kwEl = document.getElementById('docKeywords');
    var fileEl = document.getElementById('docFile');
    var msg = document.getElementById('docMsg');

    var title = ((titleEl && titleEl.value) || '').trim();
    var type = ((typeEl && typeEl.value) || '').trim();
    var keywords = ((kwEl && kwEl.value) || '').trim();
    var file = fileEl && fileEl.files && fileEl.files[0];

    var missing = [];
    if (!title) missing.push('문서명');
    if (!type) missing.push('구분');
    if (!keywords) missing.push('키워드');
    if (!file) missing.push('PDF 파일');
    if (missing.length) {
      if (msg) msg.innerHTML = '<span class="required-warn">필수값을 입력하세요: ' + missing.join(', ') + '</span>';
      return;
    }

    if (msg) msg.textContent = 'PDF 텍스트 추출 중...';
    var text = '';
    try {
      if (typeof extractFileText === 'function') {
        var r = await extractFileText(file);
        text = (r && r.text) || '';
      }
    } catch (e) { text = ''; }

    var fileUrl = '';
    try { fileUrl = URL.createObjectURL(file); } catch (e) {}

    var n = (state.docs || []).filter(function (d) { return String(d.docId).indexOf('USER-') === 0; }).length + 1;
    var id = 'USER-' + pad3(n);
    var rec = {
      docId: id, title: title, type: type, keywords: keywords,
      file: fileUrl || ('(브라우저 업로드) ' + file.name),
      fileUrl: fileUrl, fileName: file.name,
      sourceType: '사용자등록', text: text, indexed: !!text,
      registeredBy: (typeof currentUser === 'function' ? currentUser() : 'DEMO'),
      registeredAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    state.docs.unshift(rec);
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}

    if (msg) {
      msg.textContent = id + ' 등록 완료 · 등록 문서 목록에 반영되었습니다.' +
        (text ? '' : ' (본문 텍스트가 추출되지 않아 요약·번역 결과가 제한될 수 있습니다.)');
    }
    ['docTitle', 'docType', 'docKeywords'].forEach(function (x) { var el = document.getElementById(x); if (el) el.value = ''; });
    if (fileEl) fileEl.value = '';
    try { state.pendingDocText = ''; state.pendingDocFileName = ''; } catch (e) {}

    renderDocsPatched();
    var sel = document.getElementById('docAiSelect');
    if (sel) sel.value = id; // 방금 등록한 문서를 요약·번역 대상으로 자동 선택
  }

  // ---- 선택 삭제 (예시/업로드 구분 없이 모두 삭제 가능) ----
  function deleteSelectedDocsPatched() {
    var ids = [].slice.call(document.querySelectorAll('.doc-check:checked')).map(function (x) { return x.value; });
    if (!ids.length) { alert('삭제할 문서를 선택하세요.'); return; }
    state.docs = (state.docs || []).filter(function (d) { return ids.indexOf(d.docId) === -1; });
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    renderDocsPatched();
  }

  function installOverrides() {
    try { window.seedBaseDocs = function () {}; } catch (e) {}
    window.renderDocs = renderDocsPatched;
    window.registerDoc = registerDocPatched;
    window.deleteSelectedDocs = deleteSelectedDocsPatched;
  }

  function apply() {
    normalizeDocs();
    installOverrides();
    var docsTab = document.getElementById('docs');
    if (docsTab && docsTab.classList.contains('active')) renderDocsPatched();
  }

  ready(function () {
    apply();
    // app.js/ai-integration.js의 지연 재할당(+500ms 등) 이후에도 우위를 유지
    setTimeout(apply, 300);
    setTimeout(installOverrides, 1800);
  });
})();

/* Colosseum Rev20 — Etapa 1: conexión OAuth con Google Drive.
   Sincronización NO habilitada todavía: nunca escribe ni reemplaza reportes. */
(()=>{
"use strict";
const CLIENT_ID="406713503360-1sgm1cu6c4rm1gujse69basbh6s9h5o0.apps.googleusercontent.com";
const SCOPE="https://www.googleapis.com/auth/drive.file";
let tokenClient=null,accessToken=null,expiresAt=0;
const byId=id=>document.getElementById(id);
function status(message){const el=byId("driveConnectionStatus");if(el)el.textContent=message;}
function updateButtons(){const connect=byId("driveConnectBtn"),disconnect=byId("driveDisconnectBtn");if(connect)connect.textContent=accessToken?"RENOVAR CONEXIÓN":"CONECTAR GOOGLE DRIVE";if(disconnect)disconnect.hidden=!accessToken;}
function initGoogle(){
 if(!window.google?.accounts?.oauth2){status("No se cargó Google Identity Services. Comprobá tu conexión.");return false;}
 if(tokenClient)return true;
 tokenClient=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,callback:response=>{
  if(response.error){status("Google rechazó la autorización: "+response.error);return;}
  accessToken=response.access_token;expiresAt=Date.now()+(Number(response.expires_in)||3600)*1000;
  status("Conectado a Google Drive. Sincronización todavía desactivada (etapa de prueba).");
  updateButtons();
 }});
 return true;
}
function init(){
 const connect=byId("driveConnectBtn"),disconnect=byId("driveDisconnectBtn");if(!connect)return;
 connect.addEventListener("click",()=>{
  if(!initGoogle())return;
  try{tokenClient.requestAccessToken({prompt:accessToken&&Date.now()<expiresAt?"":"consent"});}
  catch(error){status("No se pudo abrir Google: "+error.message);}
 });
 disconnect.addEventListener("click",()=>{
  if(accessToken&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(accessToken,()=>{});
  accessToken=null;expiresAt=0;updateButtons();status("Desconectado. Los reportes locales no se modificaron.");
 });
 updateButtons();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

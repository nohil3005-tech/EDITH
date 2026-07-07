; EDITH NSIS Installer Custom Script
; Creates AppData/EDITH directory and places .env on first install

!macro customInstall
  ; Create EDITH data directory
  CreateDirectory "$APPDATA\EDITH"
  
  ; Copy .env to install dir (user can edit after install)
  ${If} ${FileExists} "$INSTDIR\.env"
    ; Already exists — don't overwrite
  ${Else}
    CopyFiles "$INSTDIR\resources\.env" "$INSTDIR\.env"
  ${EndIf}
  
  ; Create a shortcut to the data folder on the desktop (optional)
  ; CreateShortcut "$DESKTOP\EDITH Data.lnk" "$APPDATA\EDITH"
!macroend

!macro customUnInstall
  ; On uninstall, ask user if they want to delete their data
  MessageBox MB_YESNO "Do you want to delete your EDITH data (database, uploads)? $\nThis cannot be undone." IDNO skip_data_delete
    RMDir /r "$APPDATA\EDITH"
  skip_data_delete:
!macroend

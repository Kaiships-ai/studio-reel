---- MODULE C ----
EXTENDS Naturals
CONSTANTS Mode
VARIABLES phase, waiting, sourced, checked, panelOk, voiceOk, vtries, gatesOk, fixes, safeTried, crashes, approved, finalOk, reviewed
vars == <<phase, waiting, sourced, checked, panelOk, voiceOk, vtries, gatesOk, fixes, safeTried, crashes, approved, finalOk, reviewed>>
Init == phase = "hook" /\ waiting = (Mode = "step") /\ sourced = FALSE /\ checked = FALSE /\ panelOk = FALSE
  /\ voiceOk = FALSE /\ vtries = 0 /\ gatesOk = FALSE /\ fixes = 0 /\ safeTried = FALSE /\ crashes = 0
  /\ approved = FALSE /\ finalOk = FALSE /\ reviewed = FALSE
Ask == waiting' = (Mode = "step")
Run == waiting' = FALSE
P(a,b) == phase = a /\ phase' = b
U(S) == UNCHANGED S
HookPick   == P("hook","research") /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
NoSource   == P("research","hold") /\ Ask /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
HoldDone   == P("hold","research") /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
Sourced    == P("research","write") /\ Run /\ sourced' = TRUE /\ U(<<checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
Written    == P("write","check") /\ Run /\ checked' \in BOOLEAN /\ U(<<sourced,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
CheckFail  == P("check","write") /\ ~checked /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
CheckPass  == P("check","panel") /\ checked /\ Run /\ panelOk' \in BOOLEAN /\ U(<<sourced,checked,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
PanelDrop  == P("panel","write") /\ ~panelOk /\ Run /\ checked' = FALSE /\ U(<<sourced,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
PanelPass  == P("panel","voice") /\ panelOk /\ Run /\ vtries' = 0 /\ U(<<sourced,checked,panelOk,voiceOk,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
Quota      == P("voice","quota") /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
QuotaBack  == P("quota","voice") /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
Recorded   == P("voice","align") /\ Run /\ voiceOk' \in BOOLEAN /\ U(<<sourced,checked,panelOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
VoiceGaps  == P("align","voice") /\ ~voiceOk /\ vtries < 1 /\ vtries' = vtries + 1 /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
VoiceStuck == P("align","stuck") /\ ~voiceOk /\ vtries = 1 /\ waiting' = TRUE /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
Aligned    == P("align","timeline") /\ voiceOk /\ Run /\ fixes' = 0 /\ crashes' = 0 /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,safeTried,approved,finalOk,reviewed>>)
TLDone     == P("timeline","render") /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
Crash      == P("render","crash") /\ crashes < 2 /\ crashes' = crashes + 1 /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,approved,finalOk,reviewed>>)
Resume     == P("crash","render") /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
Rendered   == P("render","gates") /\ Run /\ gatesOk' \in BOOLEAN /\ U(<<sourced,checked,panelOk,voiceOk,vtries,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
GateFail   == P("gates","fix") /\ ~gatesOk /\ fixes < 2 /\ fixes' = fixes + 1 /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,safeTried,crashes,approved,finalOk,reviewed>>)
FixDone    == P("fix","render") /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
GoSafe     == P("gates","safe") /\ ~gatesOk /\ fixes = 2 /\ ~safeTried /\ safeTried' = TRUE /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,crashes,approved,finalOk,reviewed>>)
SafeRender == P("safe","render") /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
GateStuck  == P("gates","stuck") /\ ~gatesOk /\ fixes = 2 /\ safeTried /\ waiting' = TRUE /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
CrashStuck == P("crash","stuck") /\ crashes = 2 /\ waiting' = TRUE /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
StuckPick  == P("stuck","write") /\ Run /\ checked' = FALSE /\ panelOk' = FALSE /\ voiceOk' = FALSE /\ gatesOk' = FALSE /\ safeTried' = FALSE /\ fixes' = 0 /\ crashes' = 0 /\ vtries' = 0
              /\ U(<<sourced,approved,finalOk,reviewed>>)
GatesPass  == P("gates","review") /\ gatesOk /\ waiting' = TRUE /\ reviewed' = TRUE /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk>>)
EditLine   == P("review","write") /\ Run /\ checked' = FALSE /\ panelOk' = FALSE /\ voiceOk' = FALSE /\ gatesOk' = FALSE /\ U(<<sourced,vtries,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
NewStyle   == P("review","timeline") /\ Run /\ gatesOk' = FALSE /\ fixes' = 0 /\ crashes' = 0 /\ U(<<sourced,checked,panelOk,voiceOk,vtries,safeTried,approved,finalOk,reviewed>>)
Approve    == P("review","final") /\ Run /\ approved' = TRUE /\ finalOk' \in BOOLEAN /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,reviewed>>)
FinalRedo  == P("final","final") /\ ~finalOk /\ finalOk' = TRUE /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,reviewed>>)
FinalDone  == P("final","next") /\ finalOk /\ Run /\ U(<<sourced,checked,panelOk,voiceOk,vtries,gatesOk,fixes,safeTried,crashes,approved,finalOk,reviewed>>)
Done       == phase = "next" /\ UNCHANGED vars
Next == HookPick \/ NoSource \/ HoldDone \/ Sourced \/ Written \/ CheckFail \/ CheckPass \/ PanelDrop \/ PanelPass
  \/ Quota \/ QuotaBack \/ Recorded \/ VoiceGaps \/ VoiceStuck \/ Aligned \/ TLDone \/ Crash \/ Resume \/ Rendered
  \/ GateFail \/ FixDone \/ GoSafe \/ SafeRender \/ GateStuck \/ CrashStuck \/ StuckPick \/ GatesPass \/ EditLine
  \/ NewStyle \/ Approve \/ FinalRedo \/ FinalDone \/ Done
Spec == Init /\ [][Next]_vars
After(S) == phase \in S
NoUnsourcedClaim == After({"write","check","panel","voice","quota","align","timeline","render","crash","gates","fix","safe","review","final","next"}) => sourced
VoiceOnlyAfterChecksAndPanel == After({"voice","quota","align"}) => (checked /\ panelOk)
PicturesFollowCleanVoice == After({"timeline","render","crash","gates","fix","safe","review","final","next"}) => voiceOk
CustomerSeesOnlyPassing == After({"review"}) => gatesOk
FullOnlyAfterApproval == After({"final","next"}) => approved
FullRecheckedBeforePosting == After({"next"}) => finalOk
LoopsBounded == fixes <= 2 /\ vtries <= 1 /\ crashes <= 2
CookAsksOnlyWhenTrulyStuck == (Mode = "cook" /\ waiting /\ ~reviewed) => (phase = "stuck")
StuckOnlyAfterSafeShots == (phase = "stuck" /\ gatesOk = FALSE /\ crashes < 2 /\ vtries < 1) => safeTried
====

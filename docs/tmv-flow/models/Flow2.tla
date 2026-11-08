---- MODULE Flow2 ----
EXTENDS Naturals
CONSTANTS MaxEp, MaxFix
VARIABLES phase, mode, waiting, ep, sampleSeen, hasChar, styled, sourced, gatesOk, approved, voted, fixes, reviewed
vars == <<phase, mode, waiting, ep, sampleSeen, hasChar, styled, sourced, gatesOk, approved, voted, fixes, reviewed>>

Init == phase = "install" /\ mode = "none" /\ waiting = FALSE /\ ep = 1 /\ sampleSeen = FALSE
     /\ hasChar = FALSE /\ styled = FALSE /\ sourced = FALSE /\ gatesOk = FALSE
     /\ approved = FALSE /\ voted = 0 /\ fixes = 0 /\ reviewed = FALSE

Keep(S) == UNCHANGED S
\* a story step: in step mode the agent offers options and waits; in cook mode it picks and moves on
Ask == waiting' = (mode = "step")

InstallDone == phase = "install" /\ phase' = "sample" /\ sampleSeen' = TRUE /\ waiting' = TRUE
   /\ Keep(<<mode,ep,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
PickCook == phase = "sample" /\ phase' = "premise" /\ mode' = "cook" /\ waiting' = FALSE
   /\ Keep(<<ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
PickStep == phase = "sample" /\ phase' = "premise" /\ mode' = "step" /\ waiting' = TRUE
   /\ Keep(<<ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
PremiseChosen == phase = "premise" /\ phase' = "character" /\ Ask
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
CharacterMade == phase = "character" /\ phase' = "style" /\ hasChar' = TRUE /\ Ask
   /\ Keep(<<mode,ep,sampleSeen,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
StylePicked == phase = "style" /\ phase' = "world" /\ styled' = TRUE /\ Ask
   /\ Keep(<<mode,ep,sampleSeen,hasChar,sourced,gatesOk,approved,voted,fixes,reviewed>>)
WorldBuilt == phase = "world" /\ phase' = "branches" /\ Ask
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
BranchesAgreed == phase = "branches" /\ phase' = "script" /\ waiting' = FALSE
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
WriteScript == phase = "script" /\ phase' = "panel" /\ sourced' \in BOOLEAN
   /\ Keep(<<mode,waiting,ep,sampleSeen,hasChar,styled,gatesOk,approved,voted,fixes,reviewed>>)
PanelFix == phase = "panel" /\ ~sourced /\ phase' = "script"
   /\ Keep(<<mode,waiting,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
PanelPass == phase = "panel" /\ sourced /\ phase' = "voice"
   /\ Keep(<<mode,waiting,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
QuotaOut == phase = "voice" /\ phase' = "quota"
   /\ Keep(<<mode,waiting,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
QuotaBack == phase = "quota" /\ phase' = "voice"
   /\ Keep(<<mode,waiting,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
VoiceDone == phase = "voice" /\ phase' = "preview" /\ fixes' = 0 /\ gatesOk' \in BOOLEAN
   /\ Keep(<<mode,waiting,ep,sampleSeen,hasChar,styled,sourced,approved,voted,reviewed>>)
GateFix == phase = "preview" /\ ~gatesOk /\ fixes < MaxFix /\ phase' = "preview" /\ fixes' = fixes + 1 /\ gatesOk' \in BOOLEAN
   /\ Keep(<<mode,waiting,ep,sampleSeen,hasChar,styled,sourced,approved,voted,reviewed>>)
GateStuck == phase = "preview" /\ ~gatesOk /\ fixes = MaxFix /\ phase' = "stuck" /\ waiting' = TRUE
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
StuckChoice == phase = "stuck" /\ phase' = "script" /\ waiting' = FALSE /\ sourced' = FALSE
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,gatesOk,approved,voted,fixes,reviewed>>)
GatesPass == phase = "preview" /\ gatesOk /\ phase' = "review" /\ waiting' = TRUE /\ reviewed' = TRUE
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes>>)
ChangeStory == phase = "review" /\ phase' = "script" /\ waiting' = FALSE /\ sourced' = FALSE /\ gatesOk' = FALSE
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,approved,voted,fixes,reviewed>>)
ChangeStyle == phase = "review" /\ phase' = "style" /\ waiting' = TRUE /\ gatesOk' = FALSE
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,sourced,approved,voted,fixes,reviewed>>)
Approve == phase = "review" /\ phase' = "final" /\ waiting' = FALSE /\ approved' = TRUE
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,sourced,gatesOk,voted,fixes,reviewed>>)
FinalDone == phase = "final" /\ phase' = "pack" /\ waiting' = TRUE
   /\ Keep(<<mode,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
CustomerPosts == phase = "pack" /\ phase' = "vote" /\ voted' = ep
   /\ Keep(<<mode,waiting,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,fixes,reviewed>>)
NextEpisode == phase = "vote" /\ ep < MaxEp /\ phase' = "script" /\ ep' = ep + 1 /\ waiting' = FALSE
   /\ sourced' = FALSE /\ gatesOk' = FALSE /\ approved' = FALSE
   /\ Keep(<<mode,sampleSeen,hasChar,styled,voted,fixes,reviewed>>)
SeasonEnds == phase = "vote" /\ ep = MaxEp /\ phase' = "season"
   /\ Keep(<<mode,waiting,ep,sampleSeen,hasChar,styled,sourced,gatesOk,approved,voted,fixes,reviewed>>)
Done == phase = "season" /\ UNCHANGED vars

Next == InstallDone \/ PickCook \/ PickStep \/ PremiseChosen \/ CharacterMade \/ StylePicked
   \/ WorldBuilt \/ BranchesAgreed \/ WriteScript \/ PanelFix \/ PanelPass \/ QuotaOut \/ QuotaBack
   \/ VoiceDone \/ GateFix \/ GateStuck \/ StuckChoice \/ GatesPass \/ ChangeStory \/ ChangeStyle
   \/ Approve \/ FinalDone \/ CustomerPosts \/ NextEpisode \/ SeasonEnds \/ Done
Spec == Init /\ [][Next]_vars

After(S) == phase \in S
ValueBeforeEffort   == ~After({"install"}) => sampleSeen
StyleShowsOwnCharacter == After({"style"}) => hasChar
WorldFollowsStyle   == After({"world","branches","script","panel","voice","quota","preview","stuck","review","final","pack","vote","season"}) => styled
CookAsksNothingBeforeEp1 == (mode = "cook" /\ ~reviewed) => ~waiting
StepModeYouDecide   == (mode = "step" /\ After({"premise","character","style","world","branches"})) => waiting
NoUnsourcedVoice    == After({"voice","quota","preview","stuck","review","final","pack"}) => sourced
CustomerSeesOnlyPassing == After({"review"}) => gatesOk
FullOnlyAfterApproval   == After({"final","pack","vote"}) => approved
NextEpFollowsVote   == ep > 1 => voted >= ep - 1
NoEndlessFixLoop    == fixes <= MaxFix
====

---- MODULE B ----
EXTENDS Naturals
CONSTANTS Mode
VARIABLES phase, waiting, hasYou, namesOk, checkOk, styled, rendFails, sourced, agreed
vars == <<phase, waiting, hasYou, namesOk, checkOk, styled, rendFails, sourced, agreed>>
Init == phase = "spark" /\ waiting = (Mode = "step") /\ hasYou = FALSE /\ namesOk = FALSE /\ checkOk = FALSE
     /\ styled = FALSE /\ rendFails = 0 /\ sourced = FALSE /\ agreed = FALSE
Ask == waiting' = (Mode = "step")
Run == waiting' = FALSE
O == <<hasYou, namesOk, checkOk, styled, rendFails, sourced, agreed>>
P(a,b) == phase = a /\ phase' = b
SparkTold   == P("spark","whatif") /\ Ask /\ UNCHANGED O
WhatIfPick  == P("whatif","logline") /\ Ask /\ UNCHANGED O
LoglineOk   == P("logline","title") /\ Ask /\ UNCHANGED O
TitlePick   == P("title","init") /\ Run /\ UNCHANGED O
InitBad     == P("init","initfix") /\ Run /\ UNCHANGED O
InitFixed   == P("initfix","init") /\ Run /\ UNCHANGED O
InitOk      == P("init","you") /\ Ask /\ checkOk' = TRUE /\ UNCHANGED <<hasYou,namesOk,styled,rendFails,sourced,agreed>>
YouClash    == P("you","clash") /\ Ask /\ UNCHANGED O
ClashFixed  == P("clash","you") /\ Ask /\ UNCHANGED O
YouDone     == P("you","rival") /\ Ask /\ hasYou' = TRUE /\ namesOk' = TRUE /\ UNCHANGED <<checkOk,styled,rendFails,sourced,agreed>>
RivalDone   == P("rival","render3") /\ Run /\ UNCHANGED O
RenderBad   == P("render3","render3fix") /\ rendFails < 2 /\ rendFails' = rendFails + 1 /\ Run /\ UNCHANGED <<hasYou,namesOk,checkOk,styled,sourced,agreed>>
RenderRetry == P("render3fix","render3") /\ Run /\ UNCHANGED O
Render2Left == P("render3fix","pick") /\ rendFails = 2 /\ Ask /\ UNCHANGED O
RenderOk    == P("render3","pick") /\ Ask /\ UNCHANGED O
StylePick   == P("pick","places") /\ Ask /\ styled' = TRUE /\ UNCHANGED <<hasYou,namesOk,checkOk,rendFails,sourced,agreed>>
ChangeStyle == P("places","pick") /\ Ask /\ UNCHANGED O
PlacesOk    == P("places","rules") /\ Run /\ UNCHANGED O
RuleNoSource== P("rules","hold") /\ Ask /\ UNCHANGED O
HoldResolved== P("hold","rules") /\ Run /\ UNCHANGED O
RulesOk     == P("rules","branches") /\ Ask /\ sourced' = TRUE /\ UNCHANGED <<hasYou,namesOk,checkOk,styled,rendFails,agreed>>
BranchesOk  == P("branches","bible") /\ Run /\ agreed' = TRUE /\ UNCHANGED <<hasYou,namesOk,checkOk,styled,rendFails,sourced>>
BibleDone   == P("bible","next") /\ Run /\ UNCHANGED O
Done        == phase = "next" /\ UNCHANGED vars
Next == SparkTold \/ WhatIfPick \/ LoglineOk \/ TitlePick \/ InitBad \/ InitFixed \/ InitOk \/ YouClash \/ ClashFixed
  \/ YouDone \/ RivalDone \/ RenderBad \/ RenderRetry \/ Render2Left \/ RenderOk \/ StylePick \/ ChangeStyle \/ PlacesOk
  \/ RuleNoSource \/ HoldResolved \/ RulesOk \/ BranchesOk \/ BibleDone \/ Done
Spec == Init /\ [][Next]_vars
Decide == {"spark","whatif","logline","title","you","clash","rival","pick","places","hold","branches"}
StyleShowsYourCharacter == phase \in {"render3","render3fix","pick"} => hasYou
WorldFollowsStyle == phase \in {"places","rules","hold","branches","bible","next"} => styled
CookNeverStops == Mode = "cook" => ~waiting
StepYouDecide  == (Mode = "step" /\ phase \in Decide) => waiting
NamesChecked   == phase \in {"rival","render3","render3fix","pick","places","rules","hold","branches","bible","next"} => namesOk
ProjectValid   == phase \in {"you","clash","rival","render3","render3fix","pick","places","rules","hold","branches","bible","next"} => checkOk
NoUnsourcedRule == phase \in {"branches","bible","next"} => sourced
BranchesAgreedBeforeScript == phase = "next" => agreed
StyleRenderBounded == rendFails <= 2
====

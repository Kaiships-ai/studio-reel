# wif5 CAST (compat.json, 26/11 dc66975e). Key = body/girth/garments. P=pass A=accepted
Adult clips are bare names. A key with a coat/skirt/apron hangs cloth: avoid it.
Adult sweater key (P all except Trans_GetUp, Trans_LieDown): adult/g1/sweater
## a  Dad = adult/g1/sweater
 cheer Gest_Wave_Loop P (or Gest_Clap_Loop P) | look up Gest_LookUp_Once P (scrubs key; check sweater row) | reach/hold Act_HandOver_Once P | walk Move_Walk_Fwd_Loop P
 Daughter = child/g1/scarf+sweater: walk Move_Walk_Fwd_Loop P | hold hand BLOCKED (no child clip; nearest Walk, hand prop)
 Child idles BLOCKED: Idle_Breath_Loop, Idle_Fidget_Loop (UNSAFE_PAIRS), Move_Run_Fwd_Loop blocked
 Old man = elder/g1/sweater: raised hand BLOCKED, look around BLOCKED (nearest Idle_Stooped_Loop P)
## b  Doctor = adult/g1/nametag+pens+scrubs+stethoscope (47 P; blocked DropInTrunk, PushBagOutWindow, SitClap)
 run Move_Run_Fwd_Loop P | stop Idle_Stand_Loop P | bend/lift Act_PickUp_Once P | hold baby close BLOCKED (nearest Idle_CarryBag_Loop P)
## c  Old man = elder/g1/sweater: pour/set cup BLOCKED (nearest Act_PutDown_Once is adult-only) ; sit BLOCKED (nearest Idle_Stooped_Loop P)
 Carer = adult/g1/sweater: carry trays Move_CarryBag_Walk_Loop P, Idle_CarryBag_Loop P (swap bag->tray) | walk Move_Walk_Fwd_Loop P
## d  Father = adult/g1/sweater, Son = child/g1/scarf+sweater
 crouch/kneel BLOCKED (nearest Act_PickUp_Once P, adult only) | release upward BLOCKED (nearest Act_HandOver_Once P) | look up Gest_LookUp_Once P (adult) ; son: all BLOCKED, only Walk P
## e  Office man = adult/g1/pens+shirt:office+tie (47 P; blocked DropInTrunk, PushBagOutWindow, SitClap)
 sit typing Trans_SitDown_Once P then Act_Type_Loop P | stand up Trans_StandUp_Once P | turn Move_TurnLeft_Once P | look around Idle_LookAround_Loop P
## f  Two fathers = adult/g1/sweater and adult/g1.12/cardigan+shirt:work (49 P; only Gest_Clap blocked)
 reach Act_HandOver_Once P | let go Act_PutDown_Once P | push away Move_PushHeavy_Loop P | pull/tug BLOCKED (nearest Act_PickUp_Once P)
## g  Father = adult/g1/sweater
 walk rocking baby BLOCKED (nearest Move_CarryBag_Walk_Loop P) | sit Idle_Sit_Loop P (Trans_SitDown_Once P) | sleep sitting BLOCKED (Idle_Sleep_Loop is a lie-down; nearest Idle_Sit_Loop P)
 Son = child/g1/scarf+sweater: wash at sink BLOCKED, carry blanket BLOCKED (only Walk P)
## h  Three scientists = adult/g1/pens+shirt:office+tie (no coat), adult/g1.35/cardigan+shirt:office (50 P, none blocked), adult/g1/sweater
 stand look down BLOCKED (nearest Idle_Stand_Loop P, Gest_NodYes_Once P) | step back BLOCKED (nearest React_Startle_Once P)
 crouch BLOCKED (nearest Act_PickUp_Once P; blocked in any coat) | hand to head React_Surprise_Once P or React_Defeated_Once P (not in a coat)
## i  Old men = elder/g1/sweater: clap BLOCKED (adult Gest_Clap_Loop P on adult only) | blow BLOCKED | sit BLOCKED (nearest Idle_Stooped_Loop P)
## j  Very old man = elder/g1/sweater: sit BLOCKED | lift object to camera BLOCKED (nearest Act_HandOver_Once adult P) | close eyes BLOCKED (face mark, not a clip)
## Lists
 Child clips that exist (4): Idle_Breath_Loop, Idle_Fidget_Loop, Move_Run_Fwd_Loop, Move_Walk_Fwd_Loop. Only Move_Walk_Fwd_Loop passes; the other three are blocked.
 Elder clips (5, all P in sweater): Idle_Breath_Loop, Idle_Stooped_Loop, Move_OldWalk_Fwd_Loop, Move_Run_Fwd_Loop, Move_Walk_Fwd_Loop
 Lift/hold: Act_PickUp_Once, Act_PutDown_Once, Act_HandOver_Once, Act_Consume_Once, Idle_CarryBag_Loop, Move_CarryBag_Walk_Loop, Gest_LookBackCarry_Once. All adult, P in sweater and scrubs keys.

## Director's calls (26/11 07:05)
- face|elder|adult is not a row: no elder face on an adult body.
- Elder scenes c, i, j: only Idle_Breath, Idle_Stooped, OldWalk, Walk, Run; tell by staging, hand props (waiver), camera, faces.
- Children: Walk only (a daughter walks with dad, d son walks the lantern down, g son walks the blanket in).

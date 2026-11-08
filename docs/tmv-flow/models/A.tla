---- MODULE A ----
EXTENDS Naturals
VARIABLES phase, inst, fails, sampleSeen, gpuWarned, mode
vars == <<phase, inst, fails, sampleSeen, gpuWarned, mode>>
Init == phase = "bought" /\ inst = "idle" /\ fails = 0 /\ sampleSeen = FALSE /\ gpuWarned = FALSE /\ mode = "none"
P(a, b) == phase = a /\ phase' = b
PasteFirst   == P("bought","trust") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
TrustNo      == P("trust","exited") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
Reopen       == P("exited","trust") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
TrustNoPixi  == P("trust","nopixi") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
PixiInstalled== P("nopixi","trust") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
TrustStart   == P("trust","sample") /\ inst' = "running" /\ sampleSeen' = TRUE /\ UNCHANGED <<fails,gpuWarned,mode>>
AskKey       == P("sample","key") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
KeySaved     == P("key","waitinst") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
InstallOk    == inst = "running" /\ inst' = "ok" /\ UNCHANGED <<phase,fails,sampleSeen,gpuWarned,mode>>
InstallFail  == inst = "running" /\ inst' = "failed" /\ fails' = fails + 1 /\ UNCHANGED <<phase,sampleSeen,gpuWarned,mode>>
InstallRetry == inst = "failed" /\ fails < 2 /\ inst' = "running" /\ UNCHANGED <<phase,fails,sampleSeen,gpuWarned,mode>>
InstallHelp  == inst = "failed" /\ fails = 2 /\ phase \notin {"help"} /\ phase' = "help" /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
HelpFixed    == P("help","trust") /\ inst' = "idle" /\ fails' = 0 /\ UNCHANGED <<sampleSeen,gpuWarned,mode>>
RunDoctor    == P("waitinst","doctor") /\ inst = "ok" /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
KeyBad       == P("doctor","key") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
Quota        == P("doctor","quota") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
QuotaReset   == P("quota","doctor") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
NoGpu        == P("doctor","slow") /\ gpuWarned' = TRUE /\ UNCHANGED <<inst,fails,sampleSeen,mode>>
SlowOk       == P("slow","mode") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
AllGood      == P("doctor","mode") /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned,mode>>
PickCook     == P("mode","story") /\ mode' = "cook" /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned>>
PickStep     == P("mode","story") /\ mode' = "step" /\ UNCHANGED <<inst,fails,sampleSeen,gpuWarned>>
Done         == phase = "story" /\ UNCHANGED vars
Next == PasteFirst \/ TrustNo \/ Reopen \/ TrustNoPixi \/ PixiInstalled \/ TrustStart \/ AskKey \/ KeySaved
  \/ InstallOk \/ InstallFail \/ InstallRetry \/ InstallHelp \/ HelpFixed \/ RunDoctor \/ KeyBad \/ Quota
  \/ QuotaReset \/ NoGpu \/ SlowOk \/ AllGood \/ PickCook \/ PickStep \/ Done
Spec == Init /\ [][Next]_vars
\* Rules
SampleBeforeAnyQuestion == phase \in {"key","waitinst","doctor","quota","slow","mode"} => sampleSeen
ModeOnlyWhenAllGood     == phase \in {"mode","story"} => inst = "ok"
NoEndlessInstallRetry   == fails <= 2
SlowMachineIsTold       == phase = "story" /\ ~gpuWarned => TRUE
====

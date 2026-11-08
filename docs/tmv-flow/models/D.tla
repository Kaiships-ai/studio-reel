---- MODULE D ----
EXTENDS Naturals
CONSTANTS LastEp
VARIABLES phase, capOk, postedBy, closed, winner, extends, tie
vars == <<phase, capOk, postedBy, closed, winner, extends, tie>>
Init == phase = "cover" /\ capOk = FALSE /\ postedBy = "none" /\ closed = FALSE /\ winner = "none" /\ extends = 0 /\ tie = FALSE
P(a,b) == phase = a /\ phase' = b
CoverPick  == P("cover","caption") /\ capOk' \in BOOLEAN /\ UNCHANGED <<postedBy,closed,winner,extends,tie>>
CapBad     == P("caption","capfix") /\ ~capOk /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
CapFixed   == P("capfix","caption") /\ capOk' = TRUE /\ UNCHANGED <<postedBy,closed,winner,extends,tie>>
CapOk      == P("caption","when") /\ capOk /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
YouPost    == P("when","posted") /\ postedBy' = "you" /\ UNCHANGED <<capOk,closed,winner,extends,tie>>
LinkGiven  == P("posted","wait") /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
VoteCloses == P("wait","paste") /\ closed' = TRUE /\ UNCHANGED <<capOk,postedBy,winner,extends,tie>>
Pasted     == P("paste","count") /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
FewVotes   == P("count","few") /\ extends = 0 /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
Extend     == P("few","wait") /\ extends' = 1 /\ closed' = FALSE /\ UNCHANGED <<capOk,postedBy,winner,tie>>
KeepGoing  == P("few","count2") /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
Counted    == /\ phase \in {"count","count2"}
              /\ phase' = "result"
              /\ \/ (tie' = TRUE /\ winner' = "A")
                 \/ (tie' = FALSE /\ winner' \in {"A","B"})
              /\ UNCHANGED <<capOk,postedBy,closed,extends>>
NextEp     == P("result","recap") /\ ~LastEp /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
RecapDone  == P("recap","next") /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
LastOne    == P("result","season") /\ LastEp /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
SeasonDone == P("season","end") /\ UNCHANGED <<capOk,postedBy,closed,winner,extends,tie>>
Done       == phase \in {"next","end"} /\ UNCHANGED vars
Next == CoverPick \/ CapBad \/ CapFixed \/ CapOk \/ YouPost \/ LinkGiven \/ VoteCloses \/ Pasted \/ FewVotes \/ Extend
  \/ KeepGoing \/ Counted \/ NextEp \/ RecapDone \/ LastOne \/ SeasonDone \/ Done
Spec == Init /\ [][Next]_vars
AgentNeverPosts == postedBy \in {"none","you"}
CaptionCheckedBeforePost == phase \in {"when","posted","wait","paste","count","few","count2","result","recap","next","season","end"} => capOk
CountOnlyAfterClose == phase \in {"count","count2","result"} => closed
NextFollowsWinner == phase \in {"recap","next"} => winner # "none"
TieGoesToA == tie => winner = "A"
ExtendAtMostOnce == extends <= 1
====

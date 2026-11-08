---- MODULE Dc ----
EXTENDS Naturals
VARIABLES last, phase, capOk, postedBy, closed, winner, extends, tie
vars == <<last, phase, capOk, postedBy, closed, winner, extends, tie>>
Init == last \in BOOLEAN /\ phase = "cover" /\ capOk = FALSE /\ postedBy = "none" /\ closed = FALSE /\ winner = "none" /\ extends = 0 /\ tie = FALSE
P(a,b) == phase = a /\ phase' = b
CoverPick  == P("cover","caption") /\ capOk' \in BOOLEAN /\ UNCHANGED <<last,postedBy,closed,winner,extends,tie>>
CapBad     == P("caption","capfix") /\ ~capOk /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
CapFixed   == P("capfix","caption") /\ capOk' = TRUE /\ UNCHANGED <<last,postedBy,closed,winner,extends,tie>>
CapOk      == P("caption","when") /\ capOk /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
YouPost    == P("when","posted") /\ postedBy' = "you" /\ UNCHANGED <<last,capOk,closed,winner,extends,tie>>
LinkGiven  == P("posted","wait") /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
VoteCloses == P("wait","paste") /\ closed' = TRUE /\ UNCHANGED <<last,capOk,postedBy,winner,extends,tie>>
Pasted     == P("paste","count") /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
FewVotes   == P("count","few") /\ extends = 0 /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
Extend     == P("few","wait") /\ extends' = 1 /\ closed' = FALSE /\ UNCHANGED <<last,capOk,postedBy,winner,tie>>
KeepGoing  == P("few","count2") /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
Counted    == /\ phase \in {"count","count2"}
              /\ phase' = "result"
              /\ \/ (tie' = TRUE /\ winner' = "A")
                 \/ (tie' = FALSE /\ winner' \in {"A","B"})
              /\ UNCHANGED <<last,capOk,postedBy,closed,extends>>
NextEp     == P("result","recap") /\ ~last /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
RecapDone  == P("recap","next") /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
LastOne    == P("result","season") /\ last /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
SeasonDone == P("season","end") /\ UNCHANGED <<last,capOk,postedBy,closed,winner,extends,tie>>
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

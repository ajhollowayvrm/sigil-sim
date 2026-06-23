"""
SIGIL SIMULATOR v2.1 -- faithful rebuild against Ruleset v0.7 + Combat & Effects v0.3
=====================================================================================
Goal: play exactly how Sigil is played, per the canonical docs. Rule references in
[brackets] point at the ruleset section the code implements.

v2.1 DEBUG PASS (still not executed in-session -- review-only fixes):
  * Leaderless players now RE-ATTEMPT elevation every turn (was: only end of t2, so a
    slow opening = permanent lockout + auto-loss). Major outcome-distorting bug.
  * Character placement now respects active_slots_used()<3 (equips share active slots).
  * Equipment links on the NEXT turn (charge the turn played, link the following), not +2.
  * Empty-board draw checks zero CARDS in active+passive (incl. equips/events), not just chars.
Expect possibly 1 more small fix on first real `python3 sigil_sim.py`.

FAITHFULLY MODELED:
  [Setup]          30-card deck, 5-card hand, 3 active + 3 passive + 1 Leader slot.
  [Draw]           1/turn; empty board (0 cards in active+passive) at start of turn -> draw 2.
  [Turn order]     Draw -> Main (1 transform) -> Combat (turn 3+) -> End (elevate t2+).
  [Combat]         BLOCK FIRST: ATK<=DEF -> 0 dmg. Else dmg=ATK-DEF, THEN +10 element.
  [Elements]       Fire>Earth>Wind>Water>Fire (+10). Light+10 vs Dark.
                   Dark ignores the FIRST DEF check per turn vs a Light target.
  [Chains]         One DEF check vs summed ATK (+printed mod). +10 per participant when
                   chain element beats target. Initiator counts toward N iff affiliated.
                   A character attacks once/turn (solo OR one chain). Fizzle if a part leaves.
  [Leader]         Elevate end of turn 2 from a character in play since turn 1 (retried while
                   leaderless). Tier bonus T1+10/T2+30/T3+50/T4+70 to all stats. Attackable
                   only when the controller's active zone is empty (unless a card overrides).
                   Leaderless lockout: cannot transform until elevated; lose end of t6.
  [Transform]      1/turn; destination must be in hand; costs paid; blocked during lockout.
  [Equipment]      Charges in an ACTIVE slot the turn played; next turn moves to a PASSIVE
                   slot and links to a character; effect applies only once linked.
  [Persistent ev]  Occupy a passive slot. Wars: start-of-turn attrition + burnout coin flip.
  [Entry rule]     Characters enter at full base Max HP, then bonuses.
  [Win/Loss]       Win: enemy Leader to 0. Lose: own Leader to 0 / deck-out / no Leader by
                   end t6 / no characters left anywhere.

NOT YET MODELED (flagged): Auto-Events / Fated Encounters, sustained-by creatures, falls,
  retire-to-Disgrace AI, Me-for-You redirects, the Disgraced pile, hand-size limit, mulligan,
  The Silent's must-attack downside.

DECISION POLICY (heuristic -- the one inherently non-"exact" layer): greedy -- fill active,
charge equips, play wars/auras when live, transform toward terminals, attack to KO else
chip the lowest-effective-HP target, elevate the highest tier/stat eligible character.
"""
import random, collections

# ----------------------------------------------------------------- elements
PHYS={"Fire":"Earth","Earth":"Wind","Wind":"Water","Water":"Fire"}
def comps(e): return set(e.split(" & "))
def beats(att, deff):
    for ae in comps(att):
        for de in comps(deff):
            if PHYS.get(ae)==de: return True
            if ae=="Light" and de=="Dark": return True
    return False
def dark_vs_light(att, deff):
    return "Dark" in comps(att) and "Light" in comps(deff)

# ----------------------------------------------------------------- card data (curated; stats per CSV)
def C(name,elem,tier,hp,atk,deff,affils,abil=None,upg=None,chain=None,terminal=False):
    return dict(name=name,elem=elem,tier=tier,hp=hp,atk=atk,deff=deff,affils=set(affils),
                abil=set(abil or []),upg=upg or [],chain=chain,terminal=terminal)

CHARS={c["name"]:c for c in [
 C("Arlia, Destined Trainee","Fire",1,20,10,10,{"Destined"},upg=[("Mage Arlia",{"named":"Instructional Tome"}),("Squire Arlia",{"named":"Instructional Sword"})]),
 C("Mage Arlia","Fire",2,30,40,10,{"Mages Guild","Destined"},{"aura_mages"},upg=[("Arlia, Youngest Archmage",{"items":2}),("The Wandering Acolyte Arlia",{"disillusion":1})]),
 C("Squire Arlia","Earth",2,50,20,20,{"Kaethlaan Knights","Destined"},upg=[("Captain Arlia",{"items":2})]),
 C("Arlia, Youngest Archmage","Fire",3,40,70,20,{"Mages Guild","Destined","Attuned"},terminal=True,chain=dict(name="Consortium",affil={"Mages Guild","Attuned"},size=2,mod=0,active_only=False)),
 C("Captain Arlia","Earth",3,70,40,50,{"Kaethlaan Knights","Royal Army","Destined"},{"my_liege"},terminal=True,chain=dict(name="Triangle Attack",affil={"Kaethlaan Knights"},size=3,mod=30,active_only=False)),
 C("The Wandering Acolyte Arlia","Light",3,50,40,20,{"Destined","Wandering"},upg=[("The Ascended",{"items":1})]),
 C("The Ascended","Dark & Light",4,60,60,40,{"Divine Channel","Ascended","Wandering"},terminal=True,chain=dict(name="The Channel",affil={"Divine Channel","Ascended"},size=2,mod=0,aoe=True)),
 C("King Honathan","Light",4,90,40,50,{"Royal Army","Kaethlaan Knights"},{"aura_honathan","leader_protect_royal"},terminal=True,chain=dict(name="Rally the Realm",affil={"Royal Army"},size=2,mod=20,active_only=False)),
 C("Kael, Destined Trainee","Water",1,20,20,0,{"Destined"},upg=[("Swiftblade Kael",{"named":"Back-Alley Blade"})]),
 C("Swiftblade Kael","Water",2,40,50,10,{"Royal Army","Destined"},upg=[("Kael the Shadow",{}),("Kael the Captured",{"taken_prisoner":1})]),
 C("Kael the Shadow","Water",3,50,70,10,{"Royal Army","Destined"},{"honathan_buff","hit_passive"},upg=[("The King's Blade",{})]),
 C("The King's Blade","Water",4,70,80,30,{"Royal Army","Destined"},{"honathan_buff","hit_leader"},terminal=True),
 C("Kael the Captured","Water",2,40,30,10,{"War-Torn","Destined"},upg=[("Kael the Runaway",{})]),
 C("Kael the Runaway","Water",2,40,50,0,{"Faithless","Destined"},{"no_aura"},upg=[("Kael the Killer",{})]),
 C("Kael the Killer","Water",3,50,70,0,{"Mercenary","Faithless","Destined"},{"blood_money","no_aura"},upg=[("The Silent",{})]),
 C("The Silent","Water",4,60,90,10,{"Wandering","Faithless","Destined"},{"hit_passive","must_attack","no_aura"},terminal=True),
 C("Illyego, the Orphan","Dark",1,20,20,0,{"Faithless"},{"war_child","no_aura"},upg=[("Illyego, the Soldier",{"need_war":1})]),
 C("Illyego, the Soldier","Dark",2,40,40,10,{"Mercenary","Faithless"},{"war_child","no_aura"},upg=[("Illyego, the Conqueror",{"kills":3})]),
 C("Illyego, the Conqueror","Dark",3,60,60,20,{"Faithless"},{"war_child","war_atk","no_aura"},terminal=True),
 C("Goblin Soldier","Earth",1,30,20,10,{"Goblin"},upg=[("Goblin Lieutenant",{})]),
 C("Goblin Lieutenant","Earth",2,40,30,20,{"Goblin"},upg=[("Goblin Captain",{})]),
 C("Goblin Captain","Earth",3,60,40,30,{"Goblin"},{"aura_goblin"},terminal=True),
 C("Lor'oak Goblin Grunt","Earth",1,30,20,10,{"Goblin"},upg=[("Lor'oak Goblin Commander",{})]),
 C("Lor'oak Goblin Commander","Earth",2,50,30,20,{"Goblin"},terminal=True,chain=dict(name="Rush",affil={"Goblin"},size=2,mod=0,active_only=True)),
 C("Touched Child Hresheeba","Light",1,20,10,10,{"Attuned"},upg=[("Old Maid Hresheeba",{})]),
 C("Old Maid Hresheeba","Light",2,40,10,20,{"Divine Channel","Attuned"},{"keeper_channel"},terminal=True),
 C("Channel Being","Light",1,20,10,10,{"Divine Channel"},terminal=True),
 C("A Man Bred for War","Earth",3,60,40,30,{"Mercenary"},{"forged_in_chains"},terminal=True),
 C("Cinderpel","Fire",1,20,20,0,{"Wild"},terminal=True),C("Pyrnit","Fire",1,10,30,0,{"Wild"},terminal=True),
 C("Bogfang","Earth",1,30,20,0,{"Wild"},terminal=True),C("Stoneback","Earth",1,30,10,20,{"Wild"},terminal=True),
 C("Murlifect","Earth",1,20,20,10,{"Wild"},{"regrow"},terminal=True),
 C("Galewing","Wind",1,30,20,10,{"Wild"},terminal=True),C("Glimmermoth","Light",1,10,10,20,{"Wild"},terminal=True),
 C("Lumenkit","Light",1,20,10,10,{"Wild"},terminal=True),C("Sootcrawler","Dark",1,20,20,0,{"Wild"},terminal=True),
]}

EQUIP={
 "Instructional Tome":dict(atk=10),"Instructional Sword":dict(atk=10),"Back-Alley Blade":dict(atk=10),
 "Twin Daggers":dict(atk=10,deff=10),"Tidecaller's Pearl":dict(atk=20,water_atk=10),
 "Tower Shield":dict(deff=20,atk=-10),"Vital Charm":dict(maxhp=20,atk=-10),
 "Berserker's Brand":dict(atk=30,deff=-20),"Aegis Plate":dict(deff=40,maxhp=20,atk=-20,cannot_attack=True),
 "Warmonger's Resolve":dict(war_atk=20),"Unbroken Will":dict(immune_wartorn=True),
}
FUEL={"Whetstone":dict(atk=10),"Buckler":dict(deff=10),"Warlord's Spoils":dict(all=10)}
ONPLAY={"Field Rations":dict(heal=10)}
PERSIST={"War","Holy War","Goblin War","Taken Prisoner","Disillusioned","Rally to War",
         "Crusade","Horde Frenzy","Hardened Veterans","The Broken March"}
def is_item(c): return c in EQUIP or c in FUEL or c in ONPLAY
T2ITEMS=set(EQUIP)|set(FUEL)

# ----------------------------------------------------------------- decks
def D(*parts):
    d=[]; [d.extend(p) for p in parts]
    return d[:30] if len(d)>=30 else d+["Stoneback"]*(30-len(d))
def deck_loyalist():
    return D(["King Honathan","Arlia, Destined Trainee","Mage Arlia","Squire Arlia","Arlia, Youngest Archmage",
              "Captain Arlia","The Wandering Acolyte Arlia","The Ascended","Touched Child Hresheeba","Old Maid Hresheeba",
              "Channel Being","Channel Being","Disillusioned"],
             ["Instructional Tome","Instructional Sword","Twin Daggers","Twin Daggers","Tower Shield","Vital Charm","Field Rations"],
             ["Lumenkit","Glimmermoth","Stoneback","Stoneback","Murlifect","Bogfang","Cinderpel","Galewing"])
def deck_goblin():
    return D(["Goblin Soldier","Goblin Soldier","Goblin Soldier","Goblin Lieutenant","Goblin Lieutenant","Goblin Captain",
              "Lor'oak Goblin Grunt","Lor'oak Goblin Grunt","Lor'oak Goblin Grunt","Lor'oak Goblin Commander",
              "Goblin War","Horde Frenzy"],
             ["Twin Daggers","Tower Shield","Buckler","Buckler"],
             ["Bogfang","Bogfang","Stoneback","Stoneback","Murlifect","Murlifect","Galewing","Cinderpel"])
def deck_war():
    return D(["Kael, Destined Trainee","Swiftblade Kael","Kael the Captured","Kael the Runaway","Kael the Killer","The Silent",
              "Illyego, the Orphan","Illyego, the Soldier","Illyego, the Conqueror","A Man Bred for War",
              "Sootcrawler","Pyrnit","Bogfang",
              "War","Holy War","Taken Prisoner","Taken Prisoner","The Broken March","Rally to War"],
             ["Back-Alley Blade","Whetstone","Buckler","Twin Daggers","Tidecaller's Pearl",
              "Berserker's Brand","Warmonger's Resolve","Unbroken Will","Vital Charm","Field Rations","Whetstone"])

# ----------------------------------------------------------------- entities
class Unit:
    __slots__=("t","hp","maxhp","kills","wartorn","leader","zone","entered")
    def __init__(s,t,turn):
        s.t=t; s.maxhp=t["hp"]; s.hp=t["hp"]; s.kills=0; s.wartorn=False
        s.leader=False; s.zone="active"; s.entered=turn
    name=property(lambda s:s.t["name"]); elem=property(lambda s:s.t["elem"])
    tier=property(lambda s:s.t["tier"]); affils=property(lambda s:s.t["affils"])
    abil=property(lambda s:s.t["abil"])
class Equip:
    __slots__=("name","eff","zone","charged","link")
    def __init__(s,name): s.name=name; s.eff=EQUIP[name]; s.zone="active"; s.charged=False; s.link=None
LB={1:10,2:30,3:50,4:70}
class Player:
    def __init__(s,deck,name):
        s.name=name; s.deck=list(deck); random.shuffle(s.deck)
        s.hand=[]; s.active=[]; s.passive=[]; s.pcards=[]; s.events=set(); s.war_turns={}
        s.leader=None; s.lockout=False; s.lose=False; s.dark_ignore_used=False
        for _ in range(5): s.draw()
    def draw(s):
        if not s.deck: s.lose=True; return
        s.hand.append(s.deck.pop())
    def chars(s): return s.active+s.passive+([s.leader] if s.leader else [])
    def board_chars(s): return s.active+s.passive
    def active_slots_used(s): return len(s.active)+len([e for e in s.pcards if isinstance(e,Equip) and e.zone=="active"])
    def passive_slots_used(s): return len(s.passive)+len([e for e in s.pcards if not(isinstance(e,Equip) and e.zone=="active")])

# ----------------------------------------------------------------- stats
def has_war(p): return any(w in p.events for w in ("War","Holy War","Goblin War"))
def linked_equips(p,u): return [e for e in p.pcards if isinstance(e,Equip) and e.zone=="passive" and e.link is u]
def eff_atk(p,u):
    a=u.t["atk"]
    if u.leader: a+=LB[u.tier]
    aura = "no_aura" not in u.abil
    if aura and any("aura_honathan" in x.abil for x in p.chars()) and "Royal Army" in u.affils: a+=10
    if "honathan_buff" in u.abil and any("aura_honathan" in x.abil for x in p.chars()): a+=10
    if aura and any("aura_mages" in x.abil for x in p.chars()) and "Mages Guild" in u.affils: a+=10
    if aura and any("aura_goblin" in x.abil and x is not u for x in p.chars()) and "Goblin" in u.affils: a+=10
    if "blood_money" in u.abil: a+=10*u.kills
    if "war_atk" in u.abil and has_war(p): a+=10
    if "forged_in_chains" in u.abil and u.wartorn: a+=20
    if "Rally to War" in p.events and u.zone=="active" and has_war(p): a+=10
    if "Crusade" in p.events and "Holy War" in p.events and "Light" in comps(u.elem): a+=10
    if "Horde Frenzy" in p.events and "Goblin War" in p.events and "Goblin" in u.affils: a+=10
    for e in linked_equips(p,u):
        a+=e.eff.get("atk",0)
        if e.eff.get("water_atk") and "Water" in comps(u.elem): a+=e.eff["water_atk"]
        if e.eff.get("war_atk") and has_war(p): a+=e.eff["war_atk"]
    return max(0,a)
def eff_def(p,u):
    d=u.t["deff"]
    if u.leader: d+=LB[u.tier]
    if any("aura_honathan" in x.abil for x in p.chars()) and "Royal Army" in u.affils and "no_aura" not in u.abil: d+=10
    if "honathan_buff" in u.abil and any("aura_honathan" in x.abil for x in p.chars()): d+=10
    if "forged_in_chains" in u.abil and u.wartorn: d+=20
    if "Crusade" in p.events and "Holy War" in p.events and "Light" in comps(u.elem): d+=10
    for e in linked_equips(p,u): d+=e.eff.get("deff",0)
    return max(0,d)
def eff_maxhp(p,u):
    h=u.t["hp"]+(LB[u.tier] if u.leader else 0)
    for e in linked_equips(p,u): h+=e.eff.get("maxhp",0)
    return h
def can_attack(p,u):
    if any(e.eff.get("cannot_attack") for e in linked_equips(p,u)): return False
    if not u.wartorn: return True
    if {"war_child","immune_wartorn","forged_in_chains"} & u.abil: return True
    if any(e.eff.get("immune_wartorn") for e in linked_equips(p,u)): return True
    if "The Broken March" in p.events: return True
    return False

# ----------------------------------------------------------------- combat math
def strike(p,u,opp,tgt,atk_override=None,element=None,parts=1):
    el = element or u.elem
    atk = atk_override if atk_override is not None else eff_atk(p,u)
    dfn = eff_def(opp,tgt)
    ignored=False
    if dark_vs_light(el,tgt.elem) and not p.dark_ignore_used:
        ignored=True; p.dark_ignore_used=True
    if not ignored and atk<=dfn: return False     # BLOCKED
    base = atk if ignored else (atk-dfn)
    if beats(el,tgt.elem): base += 10*parts        # element after base damage
    tgt.hp -= base
    if tgt.hp<=0:
        u.kills += 1; return True
    return False

def deal_solo(p,u,opp):
    targets=list(opp.active)
    if "hit_passive" in u.abil: targets+=list(opp.passive)
    leader_open = opp.leader and (not opp.active) and "leader_protect_royal" not in opp.leader.abil
    if "hit_leader" in u.abil and opp.leader: targets=targets+[opp.leader]
    elif leader_open and not targets: targets=[opp.leader]
    if not targets: return
    best=None; bs=-1
    for tg in targets:
        a=eff_atk(p,u); df=eff_def(opp,tg)
        free=(dark_vs_light(u.elem,tg.elem) and not p.dark_ignore_used)
        hit = free or a>df
        dmg = a if free else a-df
        if beats(u.elem,tg.elem): dmg+=10
        sc = 100 if (hit and dmg>=tg.hp) else (dmg if hit else -1)
        if sc>bs: bs=sc; best=tg
    if best is not None: strike(p,u,opp,best)

def chain_size_needed(p,ch):
    n=ch["size"]
    if {"Divine Channel","Ascended"} & ch["affil"] and any("keeper_channel" in x.abil for x in p.chars()):
        n=max(1,n-1)
    return n

def do_chains(p,opp,used):
    if "The Broken March" in p.events:
        wt=[u for u in p.active if u.wartorn and id(u) not in used]
        if len(wt)>=2 and opp.active:
            tgt=max(opp.active,key=lambda t:t.hp)
            s=sum(eff_atk(p,x) for x in wt)
            if strike(p,wt[0],opp,tgt,atk_override=s,element=wt[0].elem,parts=len(wt)): cleanup(opp)
            for x in wt: used.add(id(x))
            if opp.leader and opp.leader.hp<=0: return True
    for u in list(p.active+p.passive):
        ch=u.t.get("chain")
        if not ch or id(u) in used: continue
        pool=[x for x in (p.active if ch.get("active_only") else p.active+p.passive) if id(x) not in used and x is not u]
        if p.leader and not ch.get("active_only"): pool.append(p.leader)
        affil_parts=[x for x in pool if ch["affil"] & x.affils]
        parts=[u]+affil_parts
        need=chain_size_needed(p,ch)
        eff_count=len(affil_parts)+(1 if ch["affil"] & u.affils else 0)
        if eff_count<need: continue
        if ch.get("aoe"):
            if len([x for x in parts if ch["affil"] & x.affils])<need: continue
            dmg=sum(eff_atk(p,x) for x in parts)*2
            ps=set(id(x) for x in parts)
            for side in (p,opp):
                for u2 in list(side.active+side.passive):
                    if id(u2) not in ps: u2.hp-=dmg
                if side.leader and id(side.leader) not in ps: side.leader.hp-=dmg
            for x in parts: used.add(id(x))
            cleanup(p); cleanup(opp)
            if opp.leader and opp.leader.hp<=0: return True
            continue
        targets=list(opp.active) or ([opp.leader] if (opp.leader and not opp.active) else [])
        if not targets:
            for x in parts: used.add(id(x))
            continue
        tgt=max(targets,key=lambda t:t.hp)
        s=sum(eff_atk(p,x) for x in parts)+ch.get("mod",0)
        if strike(p,u,opp,tgt,atk_override=s,element=u.elem,parts=len(parts)): cleanup(opp)
        for x in parts: used.add(id(x))
        if opp.leader and opp.leader.hp<=0: return True
    return False

def combat(p,opp,turn):
    if turn<3: return
    p.dark_ignore_used=False
    used=set()
    if do_chains(p,opp,used): return
    for u in list(p.active):
        if id(u) in used or not can_attack(p,u): continue
        deal_solo(p,u,opp); cleanup(opp)
        if opp.leader and opp.leader.hp<=0: return

# ----------------------------------------------------------------- start of turn
def start_of_turn(p,opp,turn):
    # equipment: mark charged, then link any charged equip into a passive slot (next-turn link)
    for e in [e for e in p.pcards if isinstance(e,Equip) and e.zone=="active"]:
        e.charged=True
    for e in [e for e in p.pcards if isinstance(e,Equip) and e.zone=="active" and e.charged]:
        if p.passive_slots_used()<3:
            e.zone="passive"
            cands=[c for c in p.board_chars() if c.zone=="active"] or p.board_chars()
            e.link = max(cands,key=lambda c:eff_atk(p,c)) if cands else None
            if e.link: e.link.hp=min(eff_maxhp(p,e.link),e.link.hp)
    for u in p.chars():
        if "regrow" in u.abil and u.hp<eff_maxhp(p,u): u.hp=min(eff_maxhp(p,u),u.hp+10)
    for pl in (p,opp):
        for u in list(pl.active):
            d=war_damage(pl,u)
            if d>0: u.hp-=d
        cleanup(pl)
    for w in list(p.war_turns):
        p.war_turns[w]+=1
        if p.war_turns[w]>(4 if w=="Holy War" else 2) and random.random()<0.5:
            p.events.discard(w); del p.war_turns[w]

def war_damage(p,u):
    if "Hardened Veterans" in p.events and "Royal Army" in u.affils: return 0
    d=0
    if "War" in p.events: d+=10
    if "Holy War" in p.events: d+= 0 if "Light" in comps(u.elem) else (20 if u.elem=="Dark" else 10)
    if "Goblin War" in p.events and "Goblin" not in u.affils: d+=10
    return d

def cleanup(pl):
    for lst in (pl.active,pl.passive):
        for u in list(lst):
            if u.hp<=0:
                for e in [e for e in pl.pcards if isinstance(e,Equip) and e.link is u]: e.link=None
                lst.remove(u)
    if pl.leader and pl.leader.hp<=0: pl.lose=True

# ----------------------------------------------------------------- main phase
def play_phase(p,opp,turn):
    moved=True
    while moved:
        moved=False
        for card in list(p.hand):
            if card in CHARS:
                if p.active_slots_used()<3:
                    p.active.append(Unit(CHARS[card],turn)); p.hand.remove(card); moved=True; break
            elif card in EQUIP:
                if p.active_slots_used()<3:
                    p.pcards.append(Equip(card)); p.hand.remove(card); moved=True; break
            elif card in ONPLAY:
                tgt=min((c for c in p.board_chars() if c.hp<eff_maxhp(p,c)),key=lambda c:c.hp,default=None)
                if tgt: tgt.hp=min(eff_maxhp(p,tgt),tgt.hp+ONPLAY[card]["heal"])
                p.hand.remove(card); moved=True; break
            elif card in PERSIST and card!="Taken Prisoner":
                if card in p.events: continue
                if card=="Crusade" and "Holy War" not in p.events: continue
                if card=="Horde Frenzy" and "Goblin War" not in p.events: continue
                if card in ("Rally to War","Hardened Veterans") and not has_war(p): continue
                if p.passive_slots_used()>=3: continue
                p.events.add(card); p.pcards.append(card)
                if card in ("War","Holy War","Goblin War"): p.war_turns[card]=0
                if card=="Holy War":
                    for pl in (p,opp):
                        if random.random()<0.5 and pl.active: pl.active[0].wartorn=True
                p.hand.remove(card); moved=True; break
    while "Taken Prisoner" in p.hand and has_war(p):
        tgt=next((u for u in p.board_chars() if not u.wartorn and
                  ({"forged_in_chains","war_child"} & u.abil or "The Broken March" in p.events)), None)
        if not tgt: break
        tgt.wartorn=True; p.hand.remove("Taken Prisoner")

def transform(p,turn):
    if p.lockout: return
    for u in p.board_chars():
        for dest,cost in u.t["upg"]:
            if dest not in p.hand: continue
            items=[c for c in p.hand if c in T2ITEMS]
            if cost.get("named") and cost["named"] not in p.hand: continue
            if cost.get("items",0)>len(items): continue
            if cost.get("kills",0)>u.kills: continue
            if cost.get("need_war") and not has_war(p): continue
            if cost.get("disillusion") and "Disillusioned" not in p.hand: continue
            if cost.get("taken_prisoner") and not has_war(p): continue
            if cost.get("named"): p.hand.remove(cost["named"])
            for _ in range(cost.get("items",0)):
                p.hand.remove(next(c for c in p.hand if c in T2ITEMS))
            if cost.get("disillusion"): p.hand.remove("Disillusioned")
            p.hand.remove(dest)
            nu=Unit(CHARS[dest],turn); nu.kills=u.kills; nu.leader=u.leader; nu.zone=u.zone; nu.entered=u.entered
            if "War-Torn" in nu.affils: nu.wartorn=True
            for lst in (p.active,p.passive):
                if u in lst: lst[lst.index(u)]=nu
            for e in p.pcards:
                if isinstance(e,Equip) and e.link is u: e.link=nu
            if u.leader: p.leader=nu
            return

def elevate(p,turn):
    elig=[u for u in p.board_chars() if u.entered<=turn-1]
    if not elig:
        p.lockout=True; return
    best=max(elig,key=lambda u:(u.tier,u.t["atk"]+u.t["hp"]))
    for lst in (p.active,p.passive):
        if best in lst: lst.remove(best)
    best.leader=True; best.zone="leader"; p.leader=best; p.lockout=False

# ----------------------------------------------------------------- game
def no_characters_left(p):
    if p.leader or p.active or p.passive: return False
    return not any(c in CHARS for c in p.deck+p.hand)

def game(dA,dB):
    A=Player(dA,"A"); B=Player(dB,"B"); players=[A,B]; active=0
    for t in range(1,73):
        turn=(t+1)//2; p=players[active]; opp=players[1-active]
        start_of_turn(p,opp,turn)
        if p.leader and p.leader.hp<=0: return (opp.name,turn,"leader")
        if not p.board_chars() and not p.pcards: p.draw(); p.draw()
        else: p.draw()
        if p.lose: return (opp.name,turn,"deckout")
        play_phase(p,opp,turn)
        transform(p,turn)
        combat(p,opp,turn)
        if opp.leader and opp.leader.hp<=0: return (p.name,turn,"leader")
        cleanup(opp)
        if opp.leader and opp.leader.hp<=0: return (p.name,turn,"leader")
        if no_characters_left(opp): return (p.name,turn,"wiped")
        if p.leader is None and turn>=2: elevate(p,turn)   # elevate at t2, retry while leaderless
        if turn>=6 and p.leader is None: return (opp.name,turn,"noleader")
        active=1-active
    return ("draw",turn,"timeout")

def run(name,fa,fb,n=1500):
    wins=collections.Counter(); ends=collections.Counter(); L=[]
    A,B=name.split(" vs ")
    for i in range(n):
        first=i%2
        w,length,why = game(fa(),fb()) if first==0 else game(fb(),fa())
        if w=="draw": wins["draw"]+=1
        elif (w=="A")==(first==0): wins[A]+=1
        else: wins[B]+=1
        ends[why]+=1; L.append(length)
    tot=sum(wins.values())
    print(f"\n=== {name} (n={n}) ===")
    for k,v in wins.most_common(): print(f"  {k:24s}{v/tot*100:5.1f}%")
    print(f"  len avg {sum(L)/len(L):.1f} median {sorted(L)[len(L)//2]} | "+
          ", ".join(f"{k} {v/tot*100:.0f}%" for k,v in ends.most_common()))

if __name__=="__main__":
    random.seed(7)
    run("War vs Loyalist", deck_war, deck_loyalist)
    run("War vs Goblin",   deck_war, deck_goblin)
    run("Loyalist vs Goblin", deck_loyalist, deck_goblin)

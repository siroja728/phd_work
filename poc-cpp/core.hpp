// ─────────────────────────────────────────────────────────────────────────────
// core.hpp — consolidated C++ port of the phdwork pipeline core.
//
// One header exposing the whole chain as plain functions:
//     parsePredicates(text)           → Model            (predicateParser.ts)
//     detectPatterns(model)           → vector<IRNode>   (patternDetector.ts)
//     generateStructuredCpp(model,ir) → string           (codeGenerator.ts)
//     analyzeExpressions(actions)     → intermediate code (stackParser.ts)
//
// Single source of truth: the same source compiles native (clang++) and to WASM
// (emcc). Thin CLI wrappers and wasm_main.cpp just include this header.
// ─────────────────────────────────────────────────────────────────────────────
#pragma once
#include <string>
#include <vector>
#include <map>
#include <set>
#include <optional>
#include <algorithm>
#include <functional>
#include <sstream>
#include <regex>
#include <cctype>

namespace core {
using std::string;
using std::vector;
using std::optional;

// ── util ──────────────────────────────────────────────────────────────────────
inline string trim(const string& s) {
  size_t a = s.find_first_not_of(" \t\r\n\f\v");
  if (a == string::npos) return "";
  size_t b = s.find_last_not_of(" \t\r\n\f\v");
  return s.substr(a, b - a + 1);
}
inline string toLower(string s){ for(char&c:s)c=(char)std::tolower((unsigned char)c); return s; }
inline vector<string> splitNonEmptyTrim(const string& s, char d){
  vector<string> out; std::stringstream ss(s); string p;
  while(std::getline(ss,p,d)){ string t=trim(p); if(!t.empty()) out.push_back(t);} return out;
}
inline bool isAlphaU(char c){ return (c>='A'&&c<='Z')||(c>='a'&&c<='z')||c=='_'; }
inline bool isAlnumU(char c){ return isAlphaU(c)||(c>='0'&&c<='9'); }
inline bool isDigitC(char c){ return c>='0'&&c<='9'; }

// ── model types (mirror src/types/index.ts) ──────────────────────────────────
struct VarDeclaration { string name, cppType; optional<string> arraySize, initializer; };
struct State { int id; string type; optional<string> label; string actions; bool mark; optional<string> thread; };
struct Trans { int from; string condition; int to; optional<string> temporal; };
struct Memo  { int stateId; string sem, resource; };
struct Model {
  vector<State> states; vector<Trans> transitions; vector<Memo> memo;
  vector<VarDeclaration> vars; vector<string> threads;
};
struct ElseItem { int stateId; string actions; };
struct Branch { string condition; int stateId; string actions; };
struct IRNode {
  string kind; // EX IF1 IF3 DO2 DO3 RETURN THREAD
  int stateId=0; string actions;                       // EX
  string condition; string thenActions; vector<ElseItem> elseBranch; // IF1
  vector<Branch> branches;                             // IF3
  string body; int bodyStateId=0; int conditionStateId=0; // DO2/DO3
  string name;                                         // THREAD
};

// ── JSON emit helpers ─────────────────────────────────────────────────────────
inline string jesc(const string& s){ string o; for(char c:s){ switch(c){
  case '"':o+="\\\"";break; case '\\':o+="\\\\";break; case '\n':o+="\\n";break;
  case '\t':o+="\\t";break; case '\r':o+="\\r";break; default:o+=c; } } return o; }
inline string jstr(const string& s){ return "\""+jesc(s)+"\""; }
inline string jopt(const optional<string>& v){ return v?jstr(*v):string("null"); }

// ═════════════════════════════════ STACK ══════════════════════════════════════
inline int stackPriority(const string& op){ if(op=="+"||op=="-")return 1; if(op=="*"||op=="/")return 2; if(op=="(")return 0; if(op=="u+"||op=="u-")return 3; return -1; }
inline int entryPriority(const string& op){ if(op=="+"||op=="-")return 1; if(op=="*"||op=="/")return 2; if(op=="(")return 3; if(op=="u+"||op=="u-")return 4; return -1; }
inline bool isStackOpChar(char c){ return c=='+'||c=='-'||c=='*'||c=='/'||c=='('; }

enum class TK { Data, Action, Unary, RParen };
struct Tok { string val; TK kind; };
inline vector<Tok> tokenize(const string& e){
  vector<Tok> t; size_t i=0,n=e.size();
  while(i<n){ char c=e[i];
    if(c==' '||c=='\t'||c=='\n'||c=='\r'||c=='\f'||c=='\v'){i++;continue;}
    if(isAlphaU(c)){ size_t j=i; while(j<n&&isAlnumU(e[j]))j++; t.push_back({e.substr(i,j-i),TK::Data}); i=j; continue; }
    if(isDigitC(c)){ size_t j=i; while(j<n&&(isDigitC(e[j])||e[j]=='.'))j++; t.push_back({e.substr(i,j-i),TK::Data}); i=j; continue; }
    if(isStackOpChar(c)){ const Tok* p=t.empty()?nullptr:&t.back();
      bool u=(c=='-'||c=='+')&&(!p||p->kind==TK::Action||p->kind==TK::Unary);
      t.push_back({string(1,c),u?TK::Unary:TK::Action}); i++; continue; }
    if(c==')'){ t.push_back({")",TK::RParen}); i++; continue; }
    i++;
  } return t;
}
struct Pair { bool hasData; string data; string op; };
struct StackRes { vector<string> intermediateCode; int tempCount; int stepCount; };
inline StackRes runStackAlgorithm(const string& expr, int startTemp){
  auto tokens=tokenize(expr); StackRes res; res.tempCount=startTemp; res.stepCount=0;
  vector<Pair> st; bool hasPending=false; string pending; int temp=startTemp; int steps=0;
  auto newTemp=[&](){ return "t"+std::to_string(++temp); };
  auto popGen=[&](const string& right)->string{
    Pair top=st.back(); st.pop_back(); bool u=(top.op=="u-"||top.op=="u+");
    string dop=u?string(1,top.op[1]):top.op; string t=newTemp();
    res.intermediateCode.push_back(u?(dop+right+" = "+t):(top.data+" "+dop+" "+right+" = "+t)); return t; };
  auto pushOp=[&](const string& op){ int prIn=entryPriority(op);
    if(op=="("){ st.push_back({false,"","("}); steps++; hasPending=false; pending.clear(); return; }
    while(!st.empty()&&st.back().op!="("&&stackPriority(st.back().op)>=prIn){ string t=popGen(pending); steps++; hasPending=true; pending=t; }
    bool u=(op=="u-"||op=="u+");
    if(u){ st.push_back({false,"",op}); steps++; }
    else { st.push_back({hasPending,pending,op}); steps++; hasPending=false; pending.clear(); } };
  size_t i=0;
  while(i<tokens.size()){ const Tok& tk=tokens[i]; const Tok* nx=(i+1<tokens.size())?&tokens[i+1]:nullptr;
    if(tk.kind==TK::Data){ hasPending=true; pending=tk.val;
      if(!nx||nx->kind==TK::RParen){ steps++; i++; }
      else if(nx->kind==TK::Action){ pushOp(nx->val); i+=2; }
      else if(nx->kind==TK::Unary){ steps++; i++; }
      else i++;
    } else if(tk.kind==TK::Unary){ pushOp("u"+tk.val); i++; }
    else if(tk.kind==TK::Action){ pushOp(tk.val=="("?"(":tk.val); i++; }
    else if(tk.kind==TK::RParen){ while(!st.empty()&&st.back().op!="("){ string t=popGen(pending); steps++; hasPending=true; pending=t; }
      if(!st.empty()){ st.pop_back(); steps++; } i++; }
    else i++;
  }
  while(!st.empty()){ if(st.back().op=="("){ st.pop_back(); break; } string t=popGen(pending); steps++; hasPending=true; pending=t; }
  res.tempCount=temp; res.stepCount=steps; return res;
}
struct Analysis { string expr; vector<string> intermediateCode; int tempCount; };
inline vector<Analysis> analyzeExpressions(const string& actionsStr, int startTemp=0){
  vector<Analysis> out; int running=startTemp;
  for(const auto& assign : splitNonEmptyTrim(actionsStr,';')){
    size_t eq=assign.find('='); if(eq==string::npos) continue;
    string lhs=trim(assign.substr(0,eq)), rhs=trim(assign.substr(eq+1));
    bool hasOp=false; for(char c:rhs) if(c=='+'||c=='-'||c=='*'||c=='/'||c=='('||c==')'){hasOp=true;break;}
    if(!hasOp) continue;
    auto r=runStackAlgorithm(rhs,running);
    if(r.stepCount>0){ out.push_back({lhs+" = "+rhs, r.intermediateCode, r.tempCount}); running=r.tempCount; }
  }
  return out;
}

// ═════════════════════════════════ PARSER ═════════════════════════════════════
inline string cppTypeOf(const string& rawType){
  static const std::map<string,string> M={{"int","int"},{"integer","int"},{"float","float"},
    {"double","double"},{"bool","bool"},{"char","char"},{"symb","char"},{"string","string"}};
  auto it=M.find(toLower(rawType)); return it==M.end()?"":it->second;
}
struct DeclResult { VarDeclaration decl; optional<string> assign; };
inline optional<DeclResult> parseDeclaration(const string& action){
  static const std::regex DECL_RE(
    R"(^([A-Za-z_][A-Za-z0-9_]*)(\[([^\]]+)\])?\s*:\s*(int|integer|float|double|bool|char|symb|string)(\s*=\s*(.+))?$)",
    std::regex::icase);
  std::smatch m; string a=trim(action);
  if(!std::regex_match(a,m,DECL_RE)) return std::nullopt;
  VarDeclaration decl; decl.name=m[1].str(); decl.cppType=cppTypeOf(m[4].str());
  string arraySize=m[3].str(); if(!arraySize.empty()) decl.arraySize=trim(arraySize);
  DeclResult r; string init=trim(m[6].str());
  if(m[5].matched && !init.empty()){ decl.initializer=init; r.assign=decl.name+" = "+init; }
  r.decl=decl; return r;
}
struct Temporal { string entryCond; optional<string> selfLoop; optional<string> temporalEntry; };
inline Temporal parseTemporal(const string& condRaw){
  string cond=trim(condRaw); if(cond.empty()) cond="true"; std::smatch m;
  static const std::regex U_RE(R"(^(.+?)\s+(?:U|[Uu]ntil)\s+(.+)$)");
  if(std::regex_match(cond,m,U_RE)){ string p=trim(m[1].str()); if(p.empty())p="true"; return {p,p,std::nullopt}; }
  static const std::regex X_RE(R"(^(?:X|[Nn]ext)(?:\s+(?![=<>!])(.+))?$)");
  if(std::regex_match(cond,m,X_RE)){ string r=trim(m[1].str()); if(r.empty())r="true"; return {r,std::nullopt,string("X")}; }
  return {cond,std::nullopt,std::nullopt};
}
struct RawPredicate {
  optional<string> thread,label; string condition,actions; vector<string> gotos;
  vector<VarDeclaration> declaredVars; optional<string> sem,resource,selfLoop,temporal;
};
inline RawPredicate parseLine(const string& line){
  RawPredicate rp; std::smatch m; string rest0=line;
  static const std::regex THREAD_RE(R"(^@(\w+)\s+([\s\S]*)$)");
  if(std::regex_match(line,m,THREAD_RE)){ rp.thread=m[1].str(); rest0=m[2].str(); }
  string rest=rest0;
  static const std::regex LABEL_RE(R"(^:(\w+)\s+([\s\S]*)$)");
  if(std::regex_match(rest0,m,LABEL_RE)){ rp.label=m[1].str(); rest=m[2].str(); }
  static const std::regex COND_RE(R"(\{([^}]*)\})");
  static const std::regex ACT_RE(R"(\[([^\]]*)\])");
  static const std::regex MEMO_RE(R"(<([^:>]+):([^>]+)>)");
  string condStr="true", rawActions; std::smatch cm;
  bool hasCond=std::regex_search(rest,cm,COND_RE); if(hasCond) condStr=cm[1].str();
  if(std::regex_search(rest,m,ACT_RE)) rawActions=m[1].str();
  if(std::regex_search(rest,m,MEMO_RE)){ rp.sem=trim(m[1].str()); rp.resource=trim(m[2].str()); }
  vector<string> execActions;
  static const std::regex GOTO_RE(R"(^goto\s+(\w+)$)");
  std::stringstream ss(rawActions); string part;
  while(std::getline(ss,part,';')){ string act=trim(part); if(act.empty())continue;
    std::smatch gm; if(std::regex_match(act,gm,GOTO_RE)){ rp.gotos.push_back(gm[1].str()); continue; }
    auto dr=parseDeclaration(act);
    if(dr){ rp.declaredVars.push_back(dr->decl); if(dr->assign) execActions.push_back(*dr->assign); continue; }
    execActions.push_back(act);
  }
  string aj; for(size_t i=0;i<execActions.size();i++){ if(i)aj+="; "; aj+=execActions[i]; }
  Temporal t=parseTemporal(hasCond?condStr:"true");
  rp.condition=t.entryCond; rp.selfLoop=t.selfLoop; rp.temporal=t.temporalEntry; rp.actions=aj;
  return rp;
}
inline Model parsePredicates(const string& text){
  vector<string> lines;
  { std::stringstream ss(text); string l; while(std::getline(ss,l,'\n')){ string t=trim(l); if(!t.empty()) lines.push_back(t);} }
  Model model; if(lines.empty()) return model;
  vector<RawPredicate> parsed; for(const auto& l:lines) parsed.push_back(parseLine(l));
  int n=(int)parsed.size();
  std::set<string> seenT;
  for(const auto& p:parsed) if(p.thread&&!seenT.count(*p.thread)){ seenT.insert(*p.thread); model.threads.push_back(*p.thread); }
  auto groupOf=[](const RawPredicate& p){ return p.thread?*p.thread:string("__main__"); };
  std::map<string,vector<int>> groupIndices; for(int i=0;i<n;i++) groupIndices[groupOf(parsed[i])].push_back(i);
  std::map<string,int> labelMap;
  for(int i=0;i<n;i++) if(parsed[i].label) labelMap[groupOf(parsed[i])+":"+*parsed[i].label]=i+1;
  for(int i=0;i<n;i++){ const RawPredicate& p=parsed[i]; int id=i+1; string g=groupOf(p);
    const vector<int>& gIdx=groupIndices[g];
    int pos=(int)(std::find(gIdx.begin(),gIdx.end(),i)-gIdx.begin());
    bool isFirst=pos==0; bool isLast=pos==(int)gIdx.size()-1 && p.gotos.empty();
    string type=isFirst?"initial":isLast?"final":"normal";
    State s; s.id=id; s.type=type; s.label=p.label; s.actions=p.actions; s.mark=false; s.thread=p.thread;
    model.states.push_back(s);
    if(pos>0){ int prevId=gIdx[pos-1]+1; Trans t; t.from=prevId; t.condition=p.condition; t.to=id; t.temporal=p.temporal; model.transitions.push_back(t); }
    if(p.selfLoop){ Trans t; t.from=id; t.condition=*p.selfLoop; t.to=id; t.temporal=string("U"); model.transitions.push_back(t); }
    for(const auto& target:p.gotos){ auto it=labelMap.find(g+":"+target); if(it!=labelMap.end()){ Trans t; t.from=id; t.condition=p.condition; t.to=it->second; model.transitions.push_back(t);} }
  }
  for(int i=0;i<n;i++) if(parsed[i].sem&&parsed[i].resource) model.memo.push_back({i+1,*parsed[i].sem,*parsed[i].resource});
  std::set<string> seenV;
  for(const auto& p:parsed) for(const auto& v:p.declaredVars) if(!seenV.count(v.name)){ seenV.insert(v.name); model.vars.push_back(v); }
  return model;
}

// ═══════════════════════════════ DETECTOR ═════════════════════════════════════
inline std::map<int,vector<Trans>> buildOutMap(const vector<Trans>& ts){
  std::map<int,vector<Trans>> m; for(const auto& t:ts) m[t.from].push_back(t); return m; }
inline const State* findState(const vector<State>& states,int id){ for(const auto& s:states) if(s.id==id) return &s; return nullptr; }

inline vector<IRNode> detectSingle(const Model& model){
  vector<State> states=model.states; std::sort(states.begin(),states.end(),[](const State&a,const State&b){return a.id<b.id;});
  auto outMap=buildOutMap(model.transitions);
  vector<IRNode> result; std::vector<int> vis;
  auto visited=[&](int id){ return std::find(vis.begin(),vis.end(),id)!=vis.end(); };
  auto mark=[&](int id){ if(!visited(id)) vis.push_back(id); };
  auto getOut=[&](int id)->vector<Trans>{ auto it=outMap.find(id); return it==outMap.end()?vector<Trans>{}:it->second; };

  struct ChainRes { vector<Branch> branches; optional<int> afterId; };
  std::function<ChainRes(int,string)> chain=[&](int startId,string startCond)->ChainRes{
    vector<Branch> br; optional<int> curId=startId; string curCond=startCond;
    while(curId.has_value()){ int id=*curId; if(visited(id)) return {br,id};
      const State* cs=findState(states,id); if(!cs) break;
      auto out=getOut(id); bool self=false; int back=0; vector<Trans> fwd;
      for(const auto& t:out){ if(t.to==id)self=true; else if(t.to<id)back++; else fwd.push_back(t); }
      if(self||back>0||fwd.size()>=2) return {br,id};
      br.push_back({curCond,cs->id,cs->actions});
      if(fwd.empty()||cs->type=="final") return {br,std::nullopt};
      const Trans& nt=fwd[0];
      if(nt.condition=="true") return {br,nt.to};
      curId=nt.to; curCond=nt.condition;
    }
    return {br,std::nullopt};
  };
  std::function<void(int)> visit=[&](int stateId){
    if(visited(stateId)) return; const State* state=findState(states,stateId); if(!state) return; mark(stateId);
    auto out=getOut(stateId); optional<Trans> self; vector<Trans> fwd;
    for(const auto& t:out) if(t.to==stateId){ self=t; break; }
    for(const auto& t:out) if(t.to>stateId) fwd.push_back(t);
    std::sort(fwd.begin(),fwd.end(),[](const Trans&a,const Trans&b){return a.to<b.to;});
    if(self){ IRNode nd; nd.kind="DO2"; nd.condition=self->condition; nd.body=state->actions; nd.bodyStateId=stateId;
      result.push_back(nd); if(!fwd.empty()) visit(fwd[0].to); return; }
    if(fwd.size()>=2){ int join=fwd.back().to,near=fwd.front().to; string thenCond=fwd.back().condition;
      IRNode nd; nd.kind="IF1"; nd.condition=thenCond; nd.thenActions=state->actions;
      vector<const State*> elseSt; for(const auto& s:states) if(s.id>=near&&s.id<join) elseSt.push_back(&s);
      for(auto* s:elseSt) nd.elseBranch.push_back({s->id,s->actions});
      result.push_back(nd); for(auto* s:elseSt) mark(s->id); visit(join); return; }
    if(fwd.size()==1){ int nid=fwd[0].to; auto no=getOut(nid); optional<Trans> back;
      for(const auto& t:no) if(t.to==stateId){ back=t; break; }
      if(back){ mark(nid); IRNode nd; nd.kind="DO3"; nd.body=state->actions; nd.bodyStateId=stateId; nd.conditionStateId=nid; nd.condition=back->condition;
        result.push_back(nd); optional<int> ex; for(const auto& t:no) if(t.to>nid){ ex=t.to; break; } if(ex) visit(*ex); return; } }
    { IRNode nd; nd.kind="EX"; nd.stateId=stateId; nd.actions=state->actions; result.push_back(nd); }
    if(fwd.empty()||state->type=="final"){ IRNode r; r.kind="RETURN"; result.push_back(r); return; }
    const Trans& next=fwd[0];
    if(next.condition!="true"){ auto c=chain(next.to,next.condition);
      if(c.branches.size()>=1){ IRNode nd; nd.kind="IF3"; nd.branches=c.branches; result.push_back(nd);
        for(const auto& b:c.branches) mark(b.stateId);
        if(c.afterId) visit(*c.afterId); else { IRNode r; r.kind="RETURN"; result.push_back(r); } return; } }
    visit(next.to);
  };
  if(!states.empty()) visit(states[0].id);
  return result;
}
inline Model threadSubModel(const Model& model,const string& thread){
  Model sub; std::vector<int> ids;
  for(const auto& s:model.states){ string th=s.thread?*s.thread:"__main__"; if(th==thread){ sub.states.push_back(s); ids.push_back(s.id);} }
  auto has=[&](int id){ return std::find(ids.begin(),ids.end(),id)!=ids.end(); };
  for(const auto& t:model.transitions) if(has(t.from)&&has(t.to)) sub.transitions.push_back(t);
  for(const auto& m:model.memo) if(has(m.stateId)) sub.memo.push_back(m);
  sub.vars=model.vars; return sub;
}
inline vector<IRNode> detectPatterns(const Model& model){
  if(model.threads.size()<=1) return detectSingle(model);
  vector<IRNode> result;
  for(const auto& thread:model.threads){ IRNode th; th.kind="THREAD"; th.name=thread; result.push_back(th);
    auto sub=detectSingle(threadSubModel(model,thread)); result.insert(result.end(),sub.begin(),sub.end()); }
  return result;
}

// ══════════════════════════════ GENERATOR ═════════════════════════════════════
inline string translateAction(const string& act){
  std::smatch m;
  if(std::regex_match(act,m,std::regex(R"(^read\((.+)\)$)"))) return "cin >> "+m[1].str();
  if(std::regex_match(act,m,std::regex(R"(^print\((.+)\)$)"))) return "cout << "+m[1].str()+" << endl";
  if(std::regex_match(act,m,std::regex(R"(^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$)"))) return m[1].str()+" = "+m[2].str();
  return act;
}
// Hand-written /(?<![=!<>])=(?!=)/g → '==' (std::regex has no lookbehind)
inline string singleEqToDoubleEq(const string& s){
  string o; for(size_t i=0;i<s.size();i++){ char c=s[i];
    if(c=='='){ char prev=i>0?s[i-1]:'\0'; char next=i+1<s.size()?s[i+1]:'\0';
      bool pb=(prev=='='||prev=='!'||prev=='<'||prev=='>'); bool nb=(next=='=');
      if(!pb&&!nb){ o+="=="; continue; } }
    o+=c; } return o;
}
inline string translateCondition(const string& cond){
  if(cond=="true") return "true"; string s=cond;
  s=std::regex_replace(s,std::regex(R"(\band\b)",std::regex::icase),"&&");
  s=std::regex_replace(s,std::regex(R"(\bor\b)",std::regex::icase),"||");
  s=std::regex_replace(s,std::regex(R"(\bnot\b)",std::regex::icase),"!");
  return singleEqToDoubleEq(s);
}
inline vector<string> expandActions(const string& actionsStr){
  auto acts=splitNonEmptyTrim(actionsStr,';');
  auto analyses=analyzeExpressions(actionsStr); vector<string> lines; size_t ai=0;
  for(const auto& act:acts){ std::smatch m;
    if(std::regex_match(act,m,std::regex(R"(^read\((.+)\)$)"))){ lines.push_back("cin >> "+m[1].str()); continue; }
    if(std::regex_match(act,m,std::regex(R"(^print\((.+)\)$)"))){ lines.push_back("cout << "+m[1].str()+" << endl"); continue; }
    size_t eq=act.find('=');
    if(eq!=string::npos && ai<analyses.size()){
      string lhs=trim(act.substr(0,eq)), rhs=trim(act.substr(eq+1));
      bool hasOp=false; for(char c:rhs) if(c=='+'||c=='-'||c=='*'||c=='/'||c=='('||c==')'){hasOp=true;break;}
      if(hasOp){ const auto& code=analyses[ai++].intermediateCode;
        if(code.size()==1){ size_t ep=code[0].rfind('='); lines.push_back(lhs+" = "+trim(code[0].substr(0,ep))); }
        else { for(size_t i=0;i<code.size();i++){ size_t ep=code[i].rfind('='); string expr=trim(code[i].substr(0,ep)); string temp=trim(code[i].substr(ep+1));
          lines.push_back(i<code.size()-1?("int "+temp+" = "+expr):(lhs+" = "+expr)); } }
        continue; } }
    lines.push_back(translateAction(act));
  }
  return lines;
}
inline string defaultInit(const string& t){
  if(t=="int")return "0"; if(t=="float")return "0.0f"; if(t=="double")return "0.0";
  if(t=="bool")return "false"; if(t=="char")return "'\\0'"; return ""; }
inline vector<string> extractUndeclaredVars(const Model& model){
  std::set<string> declared; for(const auto& v:model.vars) declared.insert(v.name);
  static const std::set<string> RESERVED={"read","print","true","false","and","or","not","endl","cin","cout","int","integer","float","double","bool","char","symb","string"};
  std::set<string> seen; vector<string> found; std::regex re(R"(\b([A-Za-z_][A-Za-z0-9_]*)\b)");
  for(const auto& s:model.states){ auto begin=std::sregex_iterator(s.actions.begin(),s.actions.end(),re); auto end=std::sregex_iterator();
    for(auto it=begin;it!=end;++it){ string v=(*it)[1].str();
      if(!RESERVED.count(toLower(v))&&!declared.count(v)&&!seen.count(v)){ seen.insert(v); found.push_back(v); } } }
  return found;
}
inline vector<string> buildVarLines(const Model& model,const string& indent,bool forGlobal=false){
  vector<string> lines;
  for(const auto& v:model.vars){
    if(v.arraySize) lines.push_back(indent+v.cppType+" "+v.name+"["+*v.arraySize+"];");
    else { string init=v.initializer?*v.initializer:(forGlobal?defaultInit(v.cppType):string(""));
      bool hasInit = v.initializer.has_value() || (forGlobal && !defaultInit(v.cppType).empty());
      lines.push_back(indent+v.cppType+" "+v.name+(hasInit?(" = "+init):"")+";"); } }
  for(const auto& name:extractUndeclaredVars(model)) lines.push_back(indent+"int "+name+(forGlobal?" = 0":"")+";");
  if(lines.empty()) lines.push_back(indent+"int x;");
  return lines;
}
inline const Memo* findMemo(const vector<Memo>& memo,int stateId){ for(const auto& e:memo) if(e.stateId==stateId) return &e; return nullptr; }
inline vector<string> emitStateBody(const string& actions,int stateId,const string& indent,const vector<Memo>& memo,bool parallel){
  const Memo* m=findMemo(memo,stateId); string inner=(m&&parallel)?indent+"    ":indent;
  vector<string> al; if(!actions.empty()) for(const auto& l:expandActions(actions)) al.push_back(inner+l+";");
  if(!m) return al;
  if(parallel){ vector<string> o; o.push_back(indent+"{"); o.push_back(indent+"    lock_guard<mutex> _lock("+m->resource+"_mtx);");
    for(auto& l:al) o.push_back(l); o.push_back(indent+"}"); return o; }
  vector<string> o=al; o.push_back(indent+"while ("+m->sem+");"); o.push_back(indent+m->sem+" = true;");
  o.push_back(indent+m->resource+"();"); o.push_back(indent+m->sem+" = false;"); return o;
}
inline vector<string> irToLines(const vector<IRNode>& ir,const string& indent,const vector<Memo>& memo,bool parallel=false){
  vector<string> out;
  for(const auto& node:ir){
    if(node.kind=="THREAD") continue;
    if(node.kind=="EX"){ auto b=emitStateBody(node.actions,node.stateId,indent,memo,parallel); out.insert(out.end(),b.begin(),b.end()); }
    else if(node.kind=="IF1"){ string cond=translateCondition(node.condition);
      if(!node.thenActions.empty()){ out.push_back(indent+"if ("+cond+") {");
        for(const auto& l:expandActions(node.thenActions)) out.push_back(indent+"    "+l+";");
        if(!node.elseBranch.empty()){ out.push_back(indent+"} else {");
          for(const auto& br:node.elseBranch){ auto b=emitStateBody(br.actions,br.stateId,indent+"    ",memo,parallel); out.insert(out.end(),b.begin(),b.end()); } }
        out.push_back(indent+"}"); }
      else if(!node.elseBranch.empty()){ out.push_back(indent+"if (!("+cond+")) {");
        for(const auto& br:node.elseBranch){ auto b=emitStateBody(br.actions,br.stateId,indent+"    ",memo,parallel); out.insert(out.end(),b.begin(),b.end()); }
        out.push_back(indent+"}"); } }
    else if(node.kind=="IF3"){ for(size_t i=0;i<node.branches.size();i++){ const auto& br=node.branches[i];
        out.push_back(indent+(i==0?"if":"else if")+" ("+translateCondition(br.condition)+") {");
        auto b=emitStateBody(br.actions,br.stateId,indent+"    ",memo,parallel); out.insert(out.end(),b.begin(),b.end());
        out.push_back(indent+"}"); } }
    else if(node.kind=="DO2"){ out.push_back(indent+"while ("+translateCondition(node.condition)+") {");
      auto b=emitStateBody(node.body,node.bodyStateId,indent+"    ",memo,parallel); out.insert(out.end(),b.begin(),b.end());
      out.push_back(indent+"}"); }
    else if(node.kind=="DO3"){ out.push_back(indent+"do {");
      auto b=emitStateBody(node.body,node.bodyStateId,indent+"    ",memo,parallel); out.insert(out.end(),b.begin(),b.end());
      out.push_back(indent+"} while ("+translateCondition(node.condition)+");"); }
    else if(node.kind=="RETURN"){ out.push_back(indent+(parallel?"return;":"return 0;")); }
  }
  return out;
}
struct SetupSplit { vector<string> setupLines; vector<IRNode> remaining; };
inline SetupSplit extractSetupActions(const vector<IRNode>& nodes){
  if(nodes.empty()||nodes[0].kind!="EX") return {{},nodes};
  const IRNode& first=nodes[0];
  vector<IRNode> rest(nodes.begin()+1,nodes.end());
  if(first.actions.empty()) return {{},rest};
  vector<string> setup; for(const auto& line:expandActions(first.actions)) setup.push_back("    "+line+";");
  return {setup,rest};
}
inline string joinLines(const vector<string>& v){ string o; for(size_t i=0;i<v.size();i++){ if(i)o+="\n"; o+=v[i]; } return o; }

inline string generateParallelCpp(const Model& model,const vector<IRNode>& ir){
  vector<string> resourceNames; std::set<string> rseen;
  for(const auto& e:model.memo) if(!rseen.count(e.resource)){ rseen.insert(e.resource); resourceNames.push_back(e.resource); }
  struct Group { string name; vector<IRNode> nodes; vector<string> setup; };
  vector<Group> raw; string curName; vector<IRNode> curNodes;
  for(const auto& node:ir){ if(node.kind=="THREAD"){ if(!curName.empty()) raw.push_back({curName,curNodes,{}}); curName=node.name; curNodes.clear(); }
    else curNodes.push_back(node); }
  if(!curName.empty()) raw.push_back({curName,curNodes,{}});
  vector<Group> groups; for(auto& g:raw){ auto sp=extractSetupActions(g.nodes); groups.push_back({g.name,sp.remaining,sp.setupLines}); }
  vector<string> lines={"#include <iostream>","#include <string>","#include <thread>","#include <mutex>","using namespace std;",""};
  auto gv=buildVarLines(model,"",true); vector<string> globalVars; for(auto& l:gv) if(l!="int x;") globalVars.push_back(l);
  if(!globalVars.empty()){ lines.push_back("// shared variables"); for(auto& l:globalVars) lines.push_back(l); lines.push_back(""); }
  if(!resourceNames.empty()){ for(auto& res:resourceNames) lines.push_back("mutex "+res+"_mtx;"); lines.push_back(""); }
  for(auto& g:groups){ lines.push_back("void "+g.name+"() {"); for(auto& l:irToLines(g.nodes,"    ",model.memo,true)) lines.push_back(l); lines.push_back("}"); lines.push_back(""); }
  lines.push_back("int main() {");
  vector<string> allSetup; for(auto& g:groups) for(auto& l:g.setup) allSetup.push_back(l);
  if(!allSetup.empty()){ lines.push_back("    // read inputs before spawning threads"); for(auto& l:allSetup) lines.push_back(l); lines.push_back(""); }
  for(auto& g:groups) lines.push_back("    thread t_"+g.name+"("+g.name+");");
  if(!groups.empty()) lines.push_back("");
  for(auto& g:groups) lines.push_back("    t_"+g.name+".join();");
  lines.push_back("    return 0;"); lines.push_back("}");
  return joinLines(lines);
}
inline string generateStructuredCpp(const Model& model,const vector<IRNode>& ir){
  if(model.states.empty()) return "// no data";
  if(model.threads.size()>1) return generateParallelCpp(model,ir);
  string varDecl=joinLines(buildVarLines(model,"    "));
  vector<string> semNames; std::set<string> sseen;
  for(const auto& e:model.memo) if(!sseen.count(e.sem)){ sseen.insert(e.sem); semNames.push_back(e.sem); }
  vector<string> lines={"#include <iostream>","using namespace std;",""};
  if(!semNames.empty()){ for(auto& s:semNames) lines.push_back("bool "+s+" = false;"); lines.push_back(""); }
  lines.push_back("int main() {"); lines.push_back(varDecl); lines.push_back("");
  for(auto& l:irToLines(ir,"    ",model.memo)) lines.push_back(l);
  lines.push_back("}");
  return joinLines(lines);
}

// ══════════════════════════ JSON emit (parity) ════════════════════════════════
inline string emitModel(const Model& mo){
  std::stringstream o; o<<"{\"states\":[";
  for(size_t i=0;i<mo.states.size();i++){ const auto& s=mo.states[i]; if(i)o<<",";
    o<<"{\"id\":"<<s.id<<",\"type\":"<<jstr(s.type)<<",\"label\":"<<jopt(s.label)
     <<",\"actions\":"<<jstr(s.actions)<<",\"mark\":"<<(s.mark?"true":"false");
    if(s.thread) o<<",\"thread\":"<<jstr(*s.thread); o<<"}"; }
  o<<"],\"transitions\":[";
  for(size_t i=0;i<mo.transitions.size();i++){ const auto& t=mo.transitions[i]; if(i)o<<",";
    o<<"{\"from\":"<<t.from<<",\"condition\":"<<jstr(t.condition)<<",\"to\":"<<t.to;
    if(t.temporal) o<<",\"temporal\":"<<jstr(*t.temporal); o<<"}"; }
  o<<"],\"memo\":[";
  for(size_t i=0;i<mo.memo.size();i++){ const auto& e=mo.memo[i]; if(i)o<<",";
    o<<"{\"stateId\":"<<e.stateId<<",\"sem\":"<<jstr(e.sem)<<",\"resource\":"<<jstr(e.resource)<<"}"; }
  o<<"],\"vars\":[";
  for(size_t i=0;i<mo.vars.size();i++){ const auto& v=mo.vars[i]; if(i)o<<",";
    o<<"{\"name\":"<<jstr(v.name)<<",\"cppType\":"<<jstr(v.cppType);
    if(v.arraySize) o<<",\"arraySize\":"<<jstr(*v.arraySize);
    if(v.initializer) o<<",\"initializer\":"<<jstr(*v.initializer); o<<"}"; }
  o<<"],\"threads\":[";
  for(size_t i=0;i<mo.threads.size();i++){ if(i)o<<","; o<<jstr(mo.threads[i]); }
  o<<"]}"; return o.str();
}
inline string emitIR(const vector<IRNode>& ir){
  std::stringstream o; o<<"[";
  for(size_t i=0;i<ir.size();i++){ const auto& n=ir[i]; if(i)o<<",";
    if(n.kind=="EX") o<<"{\"kind\":\"EX\",\"stateId\":"<<n.stateId<<",\"actions\":"<<jstr(n.actions)<<"}";
    else if(n.kind=="IF1"){ o<<"{\"kind\":\"IF1\",\"condition\":"<<jstr(n.condition)<<",\"thenActions\":"<<jstr(n.thenActions)<<",\"elseBranch\":[";
      for(size_t j=0;j<n.elseBranch.size();j++){ if(j)o<<","; o<<"{\"stateId\":"<<n.elseBranch[j].stateId<<",\"actions\":"<<jstr(n.elseBranch[j].actions)<<"}"; } o<<"]}"; }
    else if(n.kind=="IF3"){ o<<"{\"kind\":\"IF3\",\"branches\":[";
      for(size_t j=0;j<n.branches.size();j++){ if(j)o<<","; o<<"{\"condition\":"<<jstr(n.branches[j].condition)<<",\"stateId\":"<<n.branches[j].stateId<<",\"actions\":"<<jstr(n.branches[j].actions)<<"}"; } o<<"]}"; }
    else if(n.kind=="DO2") o<<"{\"kind\":\"DO2\",\"condition\":"<<jstr(n.condition)<<",\"body\":"<<jstr(n.body)<<",\"bodyStateId\":"<<n.bodyStateId<<"}";
    else if(n.kind=="DO3") o<<"{\"kind\":\"DO3\",\"body\":"<<jstr(n.body)<<",\"bodyStateId\":"<<n.bodyStateId<<",\"conditionStateId\":"<<n.conditionStateId<<",\"condition\":"<<jstr(n.condition)<<"}";
    else if(n.kind=="RETURN") o<<"{\"kind\":\"RETURN\"}";
    else if(n.kind=="THREAD") o<<"{\"kind\":\"THREAD\",\"name\":"<<jstr(n.name)<<"}";
  }
  o<<"]"; return o.str();
}

} // namespace core

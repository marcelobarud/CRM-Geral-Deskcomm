import {render,screen,fireEvent} from "@testing-library/react";
import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({role:"agent",pending:false,error:false,data:null as unknown,retry:vi.fn()}));
vi.mock("@/hooks/auth/AuthProvider",()=>({useAuth:()=>({activeOrg:{role:m.role,orgId:"org"}})}));
vi.mock("@/hooks/i18n/useT",()=>({useT:()=>(s:string)=>s}));
vi.mock("@/hooks/team/useTeamMembers",()=>({useTeamMembers:()=>({data:{data:[]},isError:false})}));
vi.mock("@tanstack/react-query",()=>({useQuery:()=>({isPending:m.pending,isError:m.error,data:m.data,refetch:m.retry})}));
import {CommercialReportPanel} from "@/components/commercial/CommercialReportPanel";
import {StageProbabilityEditor} from "@/components/commercial/StageProbabilityEditor";
beforeEach(()=>{vi.clearAllMocks();m.role="agent";m.pending=false;m.error=false;m.data={currencies:[],stages:[],sources:[]};});
describe("Leitura comercial honesta",()=>{
 it("viewer vê ausência de permissão, não métricas",()=>{m.role="viewer";render(<CommercialReportPanel pipelines={[]}/>);expect(screen.getByText("Sem permissão para relatórios comerciais.")).toBeVisible();expect(screen.queryByText("Forecast ponderado atual")).not.toBeInTheDocument();});
 it("loading e erro não aparecem como zero ou vazio",()=>{m.error=true;render(<CommercialReportPanel pipelines={[]}/>);expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o relatório comercial.");expect(screen.queryByText("Sem oportunidades para os filtros selecionados.")).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Tentar novamente"}));expect(m.retry).toHaveBeenCalled();});
 it("distingue vazio de loading",()=>{m.pending=true;render(<CommercialReportPanel pipelines={[]}/>);expect(screen.getByRole("status")).toHaveTextContent("Carregando relatório comercial");expect(screen.queryByText("Sem oportunidades para os filtros selecionados.")).not.toBeInTheDocument();});
 it("não presume BRL quando falta moeda",()=>{
  m.data={currencies:[{currency:null,open_count:1,open_value_cents:null,weighted_current_cents:null,weighted_period_cents:null,horizon_count:0,won_count:0,lost_count:0,missing_value:1,missing_probability:1,missing_date:1,created_count:1,conversion_percent:null,missing_closed_date:0,won_missing_value:0,lost_missing_value:0,won_value_cents:null,lost_value_cents:null}],stages:[],sources:[]};
  render(<CommercialReportPanel pipelines={[]}/>);expect(screen.getByRole("article",{name:"Moeda não informada"})).toBeVisible();expect(screen.getByText(/Forecast incompleto:/)).toBeVisible();expect(screen.queryByText(/BRL/)).not.toBeInTheDocument();
 });
 it("etapa permite limpar probabilidade sem inventar percentual",()=>{
  const save=vi.fn();render(<StageProbabilityEditor name="Contato" value={50} disabled={false} onSave={save}/>);
  const input=screen.getByLabelText("Probabilidade (%) · Contato");fireEvent.change(input,{target:{value:""}});fireEvent.submit(input.closest("form")!);expect(save).toHaveBeenCalledWith(null);
 });
});

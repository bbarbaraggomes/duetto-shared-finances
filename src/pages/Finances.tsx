import { useMemo } from "react";
import { AppShell } from "@/components/duetto/AppShell";
import { useDuetto } from "@/hooks/useDuettoData";
import { formatEUR } from "@/hooks/useDuettoData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";

const MONTHS_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const COLORS = {
  income: "#4CAF50",
  expense: "#E53935",
  balance: "#C8A96E",
};

const CATEGORY_COLORS: Record<string, string> = {
  casa: "#FF6B6B",
  mercado: "#4ECDC4",
  restaurante: "#45B7D1",
  transporte: "#96CEB4",
  saude: "#FFEAA7",
  lazer: "#DDA0DD",
  viagem: "#98D8C8",
  roupa: "#F7DC6F",
  educacao: "#BB8FCE",
  salario: "#82E0AA",
  animais: "#F5B041",
  ginasio: "#5DADE2",
  beleza: "#F1948A",
  tecnologia: "#85C1E9",
  combustivel: "#F8C471",
  seguros: "#AED6F1",
  farmacia: "#F9E79F",
  cafe: "#D7BDE2",
  bar: "#A3E4D7",
  cinema: "#FAD7A0",
  musica: "#D2B4DE",
  jogos: "#A9DFBF",
  desporto: "#F5CBA7",
  livros: "#D5F5E3",
  subscricoes: "#FCF3CF",
  banco: "#E8DAEF",
  impostos: "#FADBD8",
  presentes: "#D1F2EB",
  casamento: "#FCE4EC",
  bebe: "#E1BEE7",
  jardim: "#C8E6C9",
  bricolage: "#FFCCBC",
  electricidade: "#FFF9C4",
  agua: "#B2DFDB",
  internet: "#B3E5FC",
  telemovel: "#C5CAE9",
  ferias: "#FFECB3",
  hotel: "#F8BBD0",
  aviao: "#B2EBF2",
  comboio: "#DCEDC8",
  taxi: "#FFCC80",
  bicicleta: "#C5E1A5",
  natacao: "#81D4FA",
  yoga: "#CE93D8",
  fotografia: "#F48FB1",
  arte: "#FFAB91",
  teatro: "#BCAAA4",
  caridade: "#A5D6A7",
  poupanca: "#FFE082",
  outros: "#B0BEC5",
};

const Finances = () => {
  const { transactions, couple } = useDuetto();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate monthly data for last 12 months
  const monthlyData = useMemo(() => {
    const data: Array<{
      month: string;
      monthIndex: number;
      year: number;
      income: number;
      expense: number;
      balance: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === month && tDate.getFullYear() === year;
      });

      const income = monthTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      data.push({
        month: MONTHS_ABBR[month],
        monthIndex: month,
        year,
        income,
        expense,
        balance: income - expense,
      });
    }

    return data;
  }, [transactions, currentMonth, currentYear]);

  // Current month data
  const currentMonthData = monthlyData[monthlyData.length - 1];
  const previousMonthData = monthlyData[monthlyData.length - 2];

  // Calculate comparison with previous month
  const incomeComparison = previousMonthData?.income
    ? ((currentMonthData.income - previousMonthData.income) / previousMonthData.income) * 100
    : 0;
  const expenseComparison = previousMonthData?.expense
    ? ((currentMonthData.expense - previousMonthData.expense) / previousMonthData.expense) * 100
    : 0;

  // Last 6 months for bar chart
  const barChartData = monthlyData.slice(-6);

  // Category distribution for current month
  const categoryData = useMemo(() => {
    const currentMonthTransactions = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear && t.type === "expense";
    });

    const categoryMap = new Map<string, number>();
    currentMonthTransactions.forEach((t) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
    });

    const total = Array.from(categoryMap.values()).reduce((s, v) => s + v, 0);

    return Array.from(categoryMap.entries()).map(([category, value]) => ({
      category,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    })).sort((a, b) => b.value - a.value);
  }, [transactions, currentMonth, currentYear]);

  // Partner comparison for current month
  const partnerData = useMemo(() => {
    const currentMonthTransactions = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear && t.type === "expense";
    });

    const meTotal = currentMonthTransactions.filter(t => t.paidBy === "me").reduce((s, t) => s + t.amount, 0);
    const partnerTotal = currentMonthTransactions.filter(t => t.paidBy === "partner").reduce((s, t) => s + t.amount, 0);
    const total = meTotal + partnerTotal;

    return {
      me: meTotal,
      partner: partnerTotal,
      total,
      mePercentage: total > 0 ? (meTotal / total) * 100 : 0,
      partnerPercentage: total > 0 ? (partnerTotal / total) * 100 : 0,
    };
  }, [transactions, currentMonth, currentYear]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card rounded-lg p-3 shadow-soft border border-border">
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-[12px]" style={{ color: entry.color }}>
              {entry.name}: {formatEUR(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card rounded-lg p-3 shadow-soft border border-border">
          <p className="text-[13px] font-medium text-foreground">{data.category}</p>
          <p className="text-[12px] text-muted-foreground">{formatEUR(data.value)}</p>
          <p className="text-[12px] text-muted-foreground">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-[13px] text-muted-foreground">Visão geral</p>
        <h1 className="mt-1 font-display text-[26px] text-foreground">Finanças</h1>
      </header>

      <div className="px-6 pb-[120px] space-y-6">
        {/* Secção 1 — Resumo do mês atual */}
        <div className="rounded-2xl bg-card p-5 shadow-soft">
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground mb-3">
            {MONTHS_FULL[currentMonth]} {currentYear}
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Receitas</p>
              <p className="mt-1 text-[18px] font-display font-semibold text-green-600">
                {formatEUR(currentMonthData.income)}
              </p>
              {previousMonthData && (
                <p className={cn("text-[11px]", incomeComparison >= 0 ? "text-green-600" : "text-red-600")}>
                  {incomeComparison >= 0 ? "▲" : "▼"} {Math.abs(incomeComparison).toFixed(0)}% vs mês passado
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Despesas</p>
              <p className="mt-1 text-[18px] font-display font-semibold text-red-600">
                {formatEUR(currentMonthData.expense)}
              </p>
              {previousMonthData && (
                <p className={cn("text-[11px]", expenseComparison <= 0 ? "text-green-600" : "text-red-600")}>
                  {expenseComparison >= 0 ? "▲" : "▼"} {Math.abs(expenseComparison).toFixed(0)}% vs mês passado
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Saldo</p>
              <p className="mt-1 text-[18px] font-display font-semibold" style={{ color: COLORS.balance }}>
                {formatEUR(currentMonthData.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Secção 2 — Gráfico de barras (últimos 6 meses) */}
        <div className="rounded-2xl bg-card p-5 shadow-soft">
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground mb-4">
            Últimos 6 meses
          </p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickFormatter={(value) => `€${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" fill={COLORS.income} name="Receitas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill={COLORS.expense} name="Despesas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secção 3 — Gráfico de pizza por categoria */}
        {categoryData.length > 0 && (
          <div className="rounded-2xl bg-card p-5 shadow-soft">
            <p className="text-[12px] uppercase tracking-wide text-muted-foreground mb-4">
              Despesas por categoria
            </p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ percentage }) => `${percentage.toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || "#B0BEC5"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryData.slice(0, 6).map((item) => (
                <div key={item.category} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[item.category] || "#B0BEC5" }}
                  />
                  <span className="text-[11px] text-muted-foreground truncate">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Secção 4 — Comparação entre parceiros */}
        {partnerData.total > 0 && (
          <div className="rounded-2xl bg-card p-5 shadow-soft">
            <p className="text-[12px] uppercase tracking-wide text-muted-foreground mb-4">
              Quem gastou mais este mês
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-foreground">{couple.me.name}</span>
                  <span className="text-[13px] font-display font-semibold text-foreground">
                    {partnerData.mePercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-background-soft rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${partnerData.mePercentage}%`,
                      backgroundColor: COLORS.balance,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{formatEUR(partnerData.me)}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-foreground">{couple.partner.name}</span>
                  <span className="text-[13px] font-display font-semibold text-foreground">
                    {partnerData.partnerPercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-background-soft rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${partnerData.partnerPercentage}%`,
                      backgroundColor: COLORS.income,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{formatEUR(partnerData.partner)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Secção 5 — Histórico mensal */}
        <div className="rounded-2xl bg-card p-5 shadow-soft">
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground mb-4">
            Histórico mensal
          </p>
          <div className="space-y-2">
            {monthlyData.slice().reverse().map((data) => (
              <div
                key={`${data.month}-${data.year}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <span className="text-[13px] text-foreground">
                  {data.month} {data.year}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-[12px] text-green-600 w-16 text-right">
                    {formatEUR(data.income)}
                  </span>
                  <span className="text-[12px] text-red-600 w-16 text-right">
                    {formatEUR(data.expense)}
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-display font-semibold w-20 text-right",
                      data.balance >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {formatEUR(data.balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Finances;

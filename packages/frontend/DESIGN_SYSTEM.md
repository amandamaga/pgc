# Design System - Dashboard Acadêmico

## 🎨 Padrões Globais de UI

### 📐 Layout Principal

**Container Base:**
```tsx
<main className="flex-1 flex flex-col bg-white">
  <div className="p-6 lg:p-8">
    <div className="max-w-7xl mx-auto">
      {/* Conteúdo */}
    </div>
  </div>
</main>
```

**Larguras Máximas:**
- Páginas principais (Dashboard, Experiment Details): `max-w-7xl`
- Páginas específicas (Sessions, Participants): `max-w-6xl`
- Formulários/Modais: `max-w-3xl`

**Espaçamentos:**
- Padding principal: `p-6 lg:p-8`
- Gap entre seções: `space-y-6`
- Gap entre cards em grid: `gap-4`
- Margens verticais: `mb-6`

---

### 📝 Tipografia

#### Títulos de Página (H1)
```tsx
<h1 className="text-3xl font-semibold text-slate-900">
  Título da Página
</h1>
```

#### Subtítulos/Descrições
```tsx
<p className="text-sm text-slate-600">
  Descrição ou subtítulo da página
</p>
```

#### Headers de Seção (H2)
```tsx
<h2 className="text-lg font-semibold text-slate-900">
  Nome da Seção
</h2>
```

#### Headers de Tabela/Lista
```tsx
<div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
  <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
    Nome da Lista
  </h2>
</div>
```

#### Subheaders Coloridos (Status)
```tsx
<div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
  <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
    Em Execução
  </h3>
</div>
```

---

### 🔘 Botões

#### Botão Voltar
```tsx
<button
  onClick={() => navigate("/")}
  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
>
  <ArrowLeft className="h-4 w-4" />
  Voltar para dashboard
</button>
```

#### Botões Padrão
```tsx
// Primary
<Button>Ação Principal</Button>

// Secondary/Outline
<Button variant="outline">Ação Secundária</Button>

// Small
<Button size="sm">Botão Pequeno</Button>

// Ghost (ações discretas)
<Button variant="ghost" size="sm">Ação Discreta</Button>
```

---

### 📦 Cards

#### Card Base
```tsx
<div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
  {/* Header */}
  <div className="px-6 py-4 border-b border-slate-200">
    <h2 className="text-lg font-semibold text-slate-900">Título</h2>
  </div>
  
  {/* Content */}
  <div className="p-6">
    Conteúdo
  </div>
</div>
```

#### Card com Hover
```tsx
<div className="px-6 py-4 hover:bg-slate-50 transition-colors">
  Conteúdo interativo
</div>
```

#### Cards de Estatísticas
```tsx
<div className="bg-white border border-slate-200 rounded-lg p-5">
  <div className="p-2.5 rounded-lg mb-3 w-fit bg-blue-50">
    <Icon className="h-5 w-5 text-blue-600" />
  </div>
  <p className="text-2xl font-semibold text-slate-900 mb-1">24</p>
  <p className="text-xs text-slate-600 font-medium">Label</p>
</div>
```

---

### 🏷️ Badges

#### Status Badge
```tsx
<span className={cn(
  "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
  // Cores por status:
  "bg-green-50 text-green-700 border-green-200",    // Ativo/Concluído
  "bg-blue-50 text-blue-700 border-blue-200",       // Agendado
  "bg-amber-50 text-amber-700 border-amber-200",    // Em Execução
  "bg-slate-50 text-slate-600 border-slate-200"     // Rascunho/Inativo
)}>
  Status
</span>
```

#### Badge Compacto
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
  Status
</span>
```

---

### 📊 Labels com Valores

#### Formato Padrão
```tsx
<div className="flex items-center text-sm">
  <span className="font-medium text-slate-700 w-28 flex-shrink-0">Label:</span>
  <span className="text-slate-900">Valor</span>
</div>
```

#### Com Ícone
```tsx
<div className="flex items-center text-sm">
  <span className="font-medium text-slate-700 w-28 flex-shrink-0">Dupla:</span>
  <div className="flex items-center gap-3">
    <span className="inline-flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-slate-900 font-medium">P001</span>
    </span>
  </div>
</div>
```

---

### 📈 Barras de Progresso

#### Barra Padrão
```tsx
<div className="space-y-2">
  <div className="flex items-center text-sm">
    <span className="font-medium text-slate-700 w-28 flex-shrink-0">Progresso:</span>
    <div className="flex-1 flex items-center justify-between min-w-0">
      <span className="text-slate-700">
        Tentativa <span className="font-semibold text-slate-900">23</span> de <span className="font-semibold">64</span>
      </span>
      <span className="text-slate-500 font-semibold ml-4">36%</span>
    </div>
  </div>
  <div className="flex items-start">
    <div className="w-28 flex-shrink-0"></div>
    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden min-w-0">
      <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: "36%" }} />
    </div>
  </div>
</div>
```

---

### 📋 Listas e Tabelas

#### Lista com Dividers
```tsx
<div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
  <div className="divide-y divide-slate-200">
    <div className="px-6 py-4 hover:bg-slate-50 transition-colors">
      Item 1
    </div>
    <div className="px-6 py-4 hover:bg-slate-50 transition-colors">
      Item 2
    </div>
  </div>
</div>
```

#### Header de Tabela
```tsx
<thead>
  <tr className="border-b border-slate-200 bg-slate-50">
    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
      Coluna
    </th>
  </tr>
</thead>
```

---

### 🎨 Paleta de Cores

#### Background
- Principal: `bg-white`
- Secundário: `bg-slate-50`
- Destaque sutil: `bg-slate-100`

#### Bordas
- Padrão: `border-slate-200`
- Dividers: `divide-slate-200`

#### Texto
- Principal: `text-slate-900`
- Secundário: `text-slate-600`
- Terciário/Desabilitado: `text-slate-500`
- Subtítulos: `text-slate-700`

#### Status (Background + Text + Border)
- **Sucesso/Ativo:** `bg-green-50 text-green-700 border-green-200`
- **Informação/Agendado:** `bg-blue-50 text-blue-700 border-blue-200`
- **Atenção/Em Execução:** `bg-amber-50 text-amber-700 border-amber-200`
- **Neutro/Rascunho:** `bg-slate-50 text-slate-600 border-slate-200`

#### Cores de Destaque (Ícones)
- Azul: `bg-blue-50 text-blue-600`
- Verde: `bg-green-50 text-green-600`
- Roxo: `bg-purple-50 text-purple-600`
- Âmbar: `bg-amber-50 text-amber-600`

---

### 🔲 Forms

#### Input Padrão
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
  placeholder="Placeholder"
/>
```

#### Label
```tsx
<label className="block text-sm font-medium text-slate-900 mb-2">
  Campo <span className="text-red-500">*</span>
</label>
```

#### Select
```tsx
<select className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white">
  <option>Opção</option>
</select>
```

---

### 🎯 Ícones

#### Tamanhos Padrão
- Pequeno: `h-3 w-3` ou `h-3.5 w-3.5`
- Médio: `h-4 w-4`
- Grande: `h-5 w-5`
- Extra grande: `h-6 w-6`

#### Com Background
```tsx
<div className="p-2.5 rounded-lg bg-blue-50">
  <Icon className="h-5 w-5 text-blue-600" />
</div>
```

---

### 🎭 Estados

#### Hover
```tsx
hover:bg-slate-50
hover:text-slate-900
```

#### Transition
```tsx
transition-colors
transition-all duration-300
```

#### Disabled
```tsx
disabled:opacity-50 disabled:cursor-not-allowed
```

---

## ✅ Checklist de Consistência

Ao criar uma nova página, verifique:

- [ ] Background principal é `bg-white`
- [ ] Título da página usa `text-3xl font-semibold text-slate-900`
- [ ] Botão voltar segue o padrão com `ArrowLeft` icon
- [ ] Headers de seção/tabela usam `text-xs font-semibold text-slate-700 uppercase tracking-wide`
- [ ] Cards têm `bg-white border border-slate-200 rounded-lg`
- [ ] Badges seguem o padrão de cores por status
- [ ] Espaçamentos consistentes (`p-6 lg:p-8`, `space-y-6`, `gap-4`)
- [ ] Focus states nos inputs seguem o padrão
- [ ] Ícones têm tamanhos consistentes
- [ ] Hover states aplicados onde apropriado

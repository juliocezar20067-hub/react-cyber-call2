import { useEffect, useMemo, useState } from 'react';
import { playSound } from '../../sound/soundSystem';
import { getStoredState, setStoredState, subscribeStoredState } from '../../lib/stateStorage';
import {
  CATEGORY_FILTERS,
  INVENTORY_CATEGORY_DEFAULTS,
  NON_INVENTORY_CATEGORIES,
  SHOP_ITEMS,
} from '../../constants/shopCatalog';
import './Menu.css';

const SHEET_SCOPE = 'character_sheet_v2';

const STAT_KEYS = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP'];

const LIFESTYLE_OPTIONS = [
  { id: 'kibble', label: 'Kibble', cost: 100 },
  { id: 'generic_prepak', label: 'Generic Prepak', cost: 300 },
  { id: 'good_prepak', label: 'Good Prepak', cost: 600 },
  { id: 'fresh_food', label: 'Fresh Food', cost: 1500 },
];

const REPUTATION_LEVELS = [
  { level: 1, desc: 'Quem estava la' },
  { level: 2, desc: 'Amigos proximos' },
  { level: 3, desc: 'Todos os colegas e conhecidos' },
  { level: 4, desc: 'Historias por toda a area local' },
  { level: 5, desc: 'Reconhecem seu nome em outras areas' },
  { level: 6, desc: 'Reconhecem voce de vista em outras areas' },
  { level: 7, desc: 'Uma ou duas noticias foram escritas' },
  { level: 8, desc: 'Suas facanhas saem regularmente nos screamsheets' },
  { level: 9, desc: 'Sempre aparece nos screamsheets e TV' },
  { level: 10, desc: 'Conhecido mundialmente' },
];

const HOUSING_OPTIONS = [
  { id: 'street', label: 'Morando na Rua', cost: 0, note: 'Sem custo, mas com penalidades.' },
  { id: 'street_vehicle', label: 'Morando na Rua em um Veiculo', cost: null, note: 'Depende do veiculo.' },
  { id: 'cube_hotel', label: 'Cube Hotel', cost: 500 },
  { id: 'container', label: 'Conteiner de Carga', cost: 1000 },
  { id: 'studio', label: 'Apartamento Studio', cost: 1500 },
  { id: 'two_bed', label: 'Apartamento de Dois Quartos', cost: 2500 },
  { id: 'conapt_corp', label: 'Conapt Corporativo', cost: 0, note: 'Gratis para Exec, com vigilancia.' },
  { id: 'lux_conapt', label: 'Conapt de Luxo', cost: 7500 },
  { id: 'lux_penthouse', label: 'Cobertura de Luxo', cost: 15000 },
  { id: 'beaverville_house', label: 'Casa em Beaverville', cost: null, note: 'Compra (nao aluguel).' },
  { id: 'beaverville_mansion', label: 'Mansao em Beaverville', cost: null, note: 'Compra (nao aluguel).' },
  { id: 'nomad_family_vehicle', label: 'Veiculo da Familia (Nomade)', cost: 0, note: 'Sem aluguel mensal.' },
];

const resolveOption = (list, value) =>
  list.find((option) => option.id === value || option.label === value) || null;

const resolveMonthlyCost = (stored, optionCost) => {
  const numeric = Number(stored);
  if (Number.isFinite(numeric) && stored !== '') return numeric;
  if (typeof optionCost === 'number') return optionCost;
  return 0;
};

const formatMonthlyCost = (cost, isPurchase) => (isPurchase ? 'Compra' : `E$ ${cost}/mes`);

const EMPTY_SHEET = {
  criacao: {
    metodo: '',
    papelConfirmado: false,
    equipamentoInicialAplicado: false,
  },
  identificacao: {
    nome: '',
    handle: '',
    papel: '',
    rankHabilidadePapel: '',
    idade: '',
    foto: '',
    habilidadePapel: '',
    habilidadePapelDescricao: '',
  },
  estatisticas: {
    INT: '',
    REF: '',
    DEX: '',
    TECH: '',
    COOL: '',
    WILL: '',
    LUCK: '',
    MOVE: '',
    BODY: '',
    EMP: '',
    maxLUCK: '',
  },
  derivadas: {
    hp: '',
    hpMax: '',
    seriouslyWounded: '',
    deathSave: '',
    humanidade: '',
    humanidadeMax: '',
    empAtual: '',
  },
  habilidades: {},
  combate: {
    iniciativa: '',
    armadura: {
      cabeca: { tipo: '', sp: '', spAtual: '' },
      corpo: { tipo: '', sp: '', spAtual: '' },
    },
    armas: [],
  },
  cyberware: {
    neuralware: {
      linkNeural: { instalado: false, slots: '' },
      opcoes: [],
    },
    cyberopticos: {
      olhoEsquerdo: { slots: '', opcoes: [] },
      olhoDireito: { slots: '', opcoes: [] },
    },
  },
  estiloVida: {
    tipo: '',
    custoMensal: '',
    pagoAte: '',
  },
  moradia: {
    tipo: '',
    localizacao: '',
    aluguelMensal: '',
    pagoAte: '',
  },
  lifepath: {
    origemCultural: '',
    linguasDisponiveis: [],
    linguaNativa: '',
    linguaNativaNivel: 4,
    linguas: [],
    personalidade: '',
    estiloRoupa: '',
    penteado: '',
    adorno: '',
    valorMaisImportante: '',
    sentimentoPessoas: '',
    pessoaMaisImportante: '',
    posseMaisValiosa: '',
    backgroundFamiliar: '',
    ambienteInfancia: '',
    criseFamiliar: '',
    amigos: [],
    inimigos: [],
    amoresTragicos: [],
    metaVida: '',
    especifico: {},
  },
  progressao: {
    ipAtual: '',
    ipGasto: '',
    ipTotal: '',
  },
  reputacao: {
    nivel: '',
    eventos: [],
  },
  equipamento: {
    municao: {},
    granadas: {},
    itens: [],
    dinheiro: '',
  },
};

const ROLE_LIBRARY = [
  {
    papel: 'Rockerboy',
    descricao:
      'Rebeldes do rock and roll que usam performance, arte e retorica para combater a autoridade. Sao os poetas de rua, a consciencia social e os rebeldes do Tempo do Vermelho.',
    habilidadePapel: {
      nome: 'Impacto Carismatico',
      descricao:
        'O Rockerboy pode influenciar outros pela pura presenca de personalidade. Nao precisam ser artistas musicais; podem influenciar atraves da poesia, arte, danca ou simplesmente presenca fisica. Podem ser roqueiros ou lideres de cultos.',
      conversaoFas: {
        regra: 'Fora de combate, um Rockerboy pode transformar pessoas em fas.',
        tabela: [
          { grupo: 'Pessoa unica', dv: 8, condicao: 'A menos que a pessoa ativamente nao goste do Rockerboy' },
          { grupo: 'Pequeno grupo (ate 6)', dv: 10, condicao: 'A menos que o grupo ativamente nao goste do Rockerboy' },
          { grupo: 'Grande grupo', dv: 12, condicao: 'A menos que o grupo ativamente nao goste do Rockerboy' },
        ],
      },
      efeitosPorRank: [
        {
          rank: '1-2',
          locaisParaTocar: 'Pequenos clubes locais',
          impactoUnicoFa: 'Convencer o fa a fazer um pequeno favor (comprar bebida/refeicao, dar carona)',
          impactoPequenoGrupo: 'Fas pedem autografos e totens pessoais; param o Rockerboy nas ruas',
          impactoGrandeGrupo: 'Nenhum (nao tem grandes grupos de fas ainda)',
        },
        {
          rank: '3-4',
          locaisParaTocar: 'Clubes bem conhecidos',
          impactoUnicoFa: 'Convencer o fa a fazer um grande favor (ir para a cama, dar uma boa palavra)',
          impactoPequenoGrupo: 'Convencer grupo a sair regularmente com o Rockerboy; fornecer bebidas, drogas ou outros favores',
          impactoGrandeGrupo: 'Seguidores locais fortes; fas compram gravacoes e mercadorias',
        },
        {
          rank: '5-6',
          locaisParaTocar: 'Clubes grandes e importantes',
          impactoUnicoFa: 'Convencer fa a cometer crime menor (furto, ajudar em luta)',
          impactoPequenoGrupo: "Convencer grupo a atuar como 'grupo' pessoal; sair constantemente, fazer favores, fornecer coisas",
          impactoGrandeGrupo: 'Fas por toda a cidade e cidades proximas; fortemente leais, fazem grandes favores',
        },
        {
          rank: '7-8',
          locaisParaTocar: 'Pequenas salas de concerto, video local',
          impactoUnicoFa: 'Fa disposto a arriscar a vida pelo Rockerboy sem questionar',
          impactoPequenoGrupo: 'Convencer grupo a cometer crime menor',
          impactoGrandeGrupo:
            'Fas leais; lutam com grupos rivais, apoiam redes de informacao, unem-se para ajudar',
        },
        {
          rank: 9,
          locaisParaTocar: 'Grandes salas de concerto, transmissao de video nacional',
          impactoUnicoFa: 'Convencer fa a cometer crimes graves (roubar itens caros, bater em alguem)',
          impactoPequenoGrupo: '(Mantem efeitos do rank anterior)',
          impactoGrandeGrupo: '(Mantem efeitos do rank anterior)',
        },
        {
          rank: 10,
          locaisParaTocar: 'Grande estadio ou video internacional',
          impactoUnicoFa: 'Fa disposto a sacrificar-se pelo Rockerboy sem questionar',
          impactoPequenoGrupo: 'Convencer grupo a arriscar suas vidas; agir como protecao pessoal',
          impactoGrandeGrupo: 'Seguidores mundiais com fortes atributos de culto; exercito privado baseado no carisma',
        },
      ],
    },
    geracaoPersonagem: {
      ratoDeRua: {
        descricao: 'Rolar 1d10 e usar a linha correspondente para as estatisticas.',
        tabelaEstatisticas: [
          { roll: 1, INT: 7, REF: 6, DEX: 6, TECH: 5, COOL: 6, WILL: 8, LUCK: 7, MOVE: 7, BODY: 3, EMP: 8 },
          { roll: 2, INT: 3, REF: 7, DEX: 7, TECH: 7, COOL: 6, WILL: 7, LUCK: 7, MOVE: 7, BODY: 5, EMP: 8 },
          { roll: 3, INT: 4, REF: 5, DEX: 7, TECH: 7, COOL: 6, WILL: 6, LUCK: 7, MOVE: 7, BODY: 5, EMP: 8 },
          { roll: 4, INT: 4, REF: 5, DEX: 7, TECH: 7, COOL: 6, WILL: 8, LUCK: 7, MOVE: 6, BODY: 3, EMP: 8 },
          { roll: 5, INT: 5, REF: 6, DEX: 5, TECH: 5, COOL: 7, WILL: 6, LUCK: 6, MOVE: 6, BODY: 5, EMP: 8 },
          { roll: 6, INT: 5, REF: 6, DEX: 5, TECH: 5, COOL: 7, WILL: 6, LUCK: 6, MOVE: 7, BODY: 5, EMP: 8 },
          { roll: 7, INT: 6, REF: 7, DEX: 5, TECH: 6, COOL: 6, WILL: 6, LUCK: 7, MOVE: 6, BODY: 3, EMP: 8 },
          { roll: 8, INT: 5, REF: 6, DEX: 5, TECH: 6, COOL: 6, WILL: 6, LUCK: 5, MOVE: 6, BODY: 4, EMP: 8 },
          { roll: 9, INT: 5, REF: 6, DEX: 5, TECH: 6, COOL: 6, WILL: 7, LUCK: 6, MOVE: 7, BODY: 5, EMP: 8 },
          { roll: 10, INT: 5, REF: 6, DEX: 5, TECH: 6, COOL: 6, WILL: 6, LUCK: 6, MOVE: 6, BODY: 4, EMP: 8 },
        ],
        habilidadesIniciais: [
          { nome: 'Atletismo', nivel: 2 },
          { nome: 'Briga', nivel: 6 },
          { nome: 'Concentracao', nivel: 2 },
          { nome: 'Conversacao', nivel: 2 },
          { nome: 'Educacao', nivel: 2 },
          { nome: 'Evasao', nivel: 6 },
          { nome: 'Primeiros Socorros', nivel: 6 },
          { nome: 'Percepcao Humana', nivel: 6 },
          { nome: 'Linguagem (Linguagem de Rua)', nivel: 2 },
          { nome: 'Especialista Local (Sua Casa)', nivel: 4 },
          { nome: 'Percepcao', nivel: 2 },
          { nome: 'Persuasao', nivel: 6 },
          { nome: 'Furtividade', nivel: 2 },
          { nome: 'Composicao', nivel: 6 },
          { nome: 'Armas de uma Mao', nivel: 6 },
          { nome: 'Armas Brancas', nivel: 6 },
          { nome: 'Tocar Instrumentos (escolha 1)', nivel: 6 },
          { nome: 'Resistir Tortura/Drogas', nivel: 6 },
          { nome: 'Malandragem', nivel: 6 },
          { nome: 'Guarda-roupa & Estilo', nivel: 4 },
        ],
      },
      edgerunner: {
        descricao:
          'Recebe 86 pontos para distribuir entre as habilidades listadas. Nenhuma habilidade pode ultrapassar nivel 6 ou ser inferior a 2.',
        listaHabilidades: [
          'Atletismo',
          'Briga',
          'Concentracao',
          'Conversacao',
          'Educacao',
          'Evasao',
          'Primeiros Socorros',
          'Percepcao Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepcao',
          'Persuasao',
          'Furtividade',
          'Composicao',
          'Armas de uma Mao',
          'Armas Brancas',
          'Tocar Instrumentos (escolha 1)',
          'Resistir Tortura/Drogas',
          'Malandragem',
          'Guarda-roupa & Estilo',
        ],
        habilidadesObrigatoriasMinimo2: [
          'Atletismo',
          'Briga',
          'Concentracao',
          'Conversacao',
          'Educacao',
          'Evasao',
          'Primeiros Socorros',
          'Percepcao Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepcao',
          'Persuasao',
          'Furtividade',
        ],
      },
      pacoteCompleto: {
        descricao: 'Constroi o personagem do zero com pontos.',
        regras: {
          pontosEstatisticas: 62,
          minimoEstatistica: 2,
          maximoEstatistica: 8,
          pontosHabilidade: 86,
          dinheiroInicial: 2550,
          dinheiroModaExtra: 800,
        },
        habilidadesObrigatoriasMinimo2: [
          'Atletismo',
          'Briga',
          'Concentracao',
          'Conversacao',
          'Educacao',
          'Evasao',
          'Primeiros Socorros',
          'Percepcao Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepcao',
          'Persuasao',
          'Furtividade',
        ],
      },
    },
    equipamentoInicial: {
      armasEArmadura: [
        { item: 'Rifle de Assalto', quantidade: 1 },
        { item: 'Pistola Muito Pesada', quantidade: 1 },
        { item: 'Arma Branca Pesada', quantidade: 1 },
        { item: 'Municao Basica de Pistola Muito Pesada', quantidade: 50 },
        { item: 'Municao Basica de Rifle', quantidade: 70 },
        { item: 'Armadura Corporal Blindagem Leve', sp: 11 },
        { item: 'Armadura de Cabeca Blindagem Leve', sp: 11 },
        { item: 'Dinheiro extra', quantidade: 500 },
      ],
      moda: {
        estilos: [
          'Elegante Generico',
          'Roupas de Lazer',
          'Urbano Vistoso',
          'Executivo',
          'Alta Moda',
          'Boemio',
          'Bolsa Feminina Chic',
          'Roupas de Gangue',
          'Couro Nomade',
          'Asia Pop',
        ],
        adornos: [
          'Tatuagens',
          'Espelho de bolso',
          'Cicatrizes rituais',
          'Luvas com espetos',
          'Argolas de nariz',
          'Piercings (lingua ou outros)',
          'Implantes de unhas estranhos',
          'Botas com espetos ou rodas',
          'Luvas sem dedos',
          'Bijuteria estranha',
        ],
      },
    },
    lifepathEspecifico: {
      tipoRockerboy: [
        { roll: 1, tipo: 'Musico solo' },
        { roll: 2, tipo: 'Banda' },
        { roll: 3, tipo: 'Poeta/Artista de rua' },
        { roll: 4, tipo: 'Lider de culto' },
        { roll: 5, tipo: 'Ativista politico' },
        { roll: 6, tipo: 'Comediante' },
        { roll: 7, tipo: 'Dancarino/Performista' },
        { roll: 8, tipo: 'Apresentador de midia' },
        { roll: 9, tipo: 'Artista de rua (malabarista, mimico, etc.)' },
        { roll: 10, tipo: 'Influenciador digital' },
      ],
      quemEstaAtras: [
        { roll: 1, descricao: 'Uma gravadora independente' },
        { roll: 2, descricao: 'Um Fixer local que te promove' },
        { roll: 3, descricao: 'Fas dedicados que formaram um clube' },
        { roll: 4, descricao: 'Uma corporacao que quer te cooptar' },
        { roll: 5, descricao: 'Um politico que usa sua influencia' },
        { roll: 6, descricao: 'Um rival que quer te ver fracassar' },
      ],
    },
    exemploPersonagem: {
      papel: 'Rockerboy',
      nome: 'Johnny Silverhand',
      handle: 'Silverhand',
      estatisticas: {
        INT: 7,
        REF: 8,
        DEX: 6,
        TECH: 5,
        COOL: 8,
        WILL: 6,
        LUCK: 5,
        MOVE: 6,
        BODY: 7,
        EMP: 5,
      },
      rankHabilidadePapel: 4,
      habilidades: {
        Atletismo: 2,
        Briga: 6,
        Concentracao: 2,
        Conversacao: 2,
        Educacao: 2,
        Evasao: 6,
        'Primeiros Socorros': 6,
        'Percepcao Humana': 6,
        'Linguagem (Linguagem de Rua)': 2,
        'Especialista Local (Night City)': 4,
        Percepcao: 2,
        Persuasao: 6,
        Furtividade: 2,
        Composicao: 6,
        'Armas de uma Mao': 6,
        'Armas Brancas': 6,
        'Tocar Instrumentos (Guitarra)': 6,
        'Resistir Tortura/Drogas': 6,
        Malandragem: 6,
        'Guarda-roupa & Estilo': 4,
      },
      equipamento: {
        armaPrincipal: 'Rifle de Assalto',
        armaSecundaria: 'Pistola Muito Pesada',
        armaCorpoACorpo: 'Arma Branca Pesada',
        municaoPistola: 50,
        municaoRifle: 70,
        armadura: 'Blindagem Leve (SP 11 corpo e cabeca)',
        dinheiroExtra: 500,
      },
    },
  },
  {
    papel: 'Solo',
    descricao:
      'Assassinos, guarda-costas, assassinos e soldados de aluguel num novo mundo sem lei. Renasceu com uma arma em sua mao—seja como guarda freelance, assassino de aluguel, ou cybersoldado corporativo. Conforme acumula danos de batalha, confia cada vez mais em tecnologia: membros ciberneticos, chips de bio programas, drogas de combate.',
    habilidadePapel: {
      nome: 'Consciencia de Combate',
      descricao:
        'O Solo pode usar seu treinamento para ter uma consciencia situacional aprimorada do campo de batalha. Quando o combate comeca (antes da Iniciativa), a qualquer momento fora do combate, ou em combate com uma Acao, um Solo pode dividir o numero total de pontos que tem em sua Habilidade de Papel de Consciencia de Combate entre as seguintes habilidades. Se um Solo escolhe nao mudar suas atribuicoes, as anteriores persistem. Ativar algumas habilidades custa mais pontos.',
      habilidades: [
        {
          nome: 'Deflexao de Dano',
          descricao: "Treinado para 'rolar com os socos', reduzindo danos.",
          custos: [
            { pontos: 2, efeito: 'diminui o primeiro dano desta rodada em 1' },
            { pontos: 4, efeito: 'diminui o primeiro dano desta rodada em 2' },
            { pontos: 6, efeito: 'diminui o primeiro dano desta rodada em 3' },
            { pontos: 8, efeito: 'diminui o primeiro dano desta rodada em 4' },
            { pontos: 10, efeito: 'diminui o primeiro dano desta rodada em 5' },
          ],
        },
        {
          nome: 'Recuperacao de Falhas',
          descricao: 'Ignora falhas criticas (resultado 1 no dado) ao atacar. Essas jogadas ainda sao mantidas como 1, no entanto.',
          custo: 4,
        },
        {
          nome: 'Reacao de Iniciativa',
          descricao: 'Cada ponto adiciona +1 as jogadas de Iniciativa.',
          custo: '1 por +1',
        },
        {
          nome: 'Ataque de Precisao',
          descricao: 'Pontaria precisa, dando maior precisao.',
          custos: [
            { pontos: 3, efeito: '+1 em qualquer ataque' },
            { pontos: 6, efeito: '+2 em qualquer ataque' },
            { pontos: 9, efeito: '+3 em qualquer ataque' },
          ],
        },
        {
          nome: 'Ponto Fraco',
          descricao: 'Procura pontos fracos para danificar alvos fortemente blindados.',
          custo: '1 por +1',
          efeito: 'Cada ponto adiciona +1 ao dano (antes da armadura) do primeiro ataque bem-sucedido na rodada',
        },
        {
          nome: 'Deteccao de Ameaca',
          descricao: 'Consciencia situacional aumentada.',
          custo: '1 por +1',
          efeito: '+1 em qualquer teste de Percepcao',
        },
      ],
    },
    geracaoPersonagem: {
      ratoDeRua: {
        descricao: 'Rolar 1d10 e usar a linha correspondente para as estatisticas.',
        tabelaEstatisticas: [
          { roll: 1, INT: 6, REF: 7, DEX: 7, TECH: 3, COOL: 8, WILL: 6, LUCK: 5, MOVE: 5, BODY: 6, EMP: 5 },
          { roll: 2, INT: 7, REF: 8, DEX: 6, TECH: 3, COOL: 6, WILL: 6, LUCK: 7, MOVE: 5, BODY: 6, EMP: 6 },
          { roll: 3, INT: 5, REF: 8, DEX: 7, TECH: 4, COOL: 7, WILL: 7, LUCK: 6, MOVE: 7, BODY: 8, EMP: 5 },
          { roll: 4, INT: 5, REF: 8, DEX: 6, TECH: 4, COOL: 6, WILL: 7, LUCK: 6, MOVE: 5, BODY: 7, EMP: 6 },
          { roll: 5, INT: 6, REF: 7, DEX: 6, TECH: 5, COOL: 7, WILL: 6, LUCK: 7, MOVE: 5, BODY: 7, EMP: 6 },
          { roll: 6, INT: 7, REF: 7, DEX: 6, TECH: 5, COOL: 6, WILL: 7, LUCK: 7, MOVE: 6, BODY: 6, EMP: 5 },
          { roll: 7, INT: 6, REF: 8, DEX: 7, TECH: 5, COOL: 6, WILL: 7, LUCK: 6, MOVE: 7, BODY: 5, EMP: 6 },
          { roll: 8, INT: 6, REF: 8, DEX: 5, TECH: 4, COOL: 8, WILL: 7, LUCK: 5, MOVE: 6, BODY: 7, EMP: 5 },
          { roll: 9, INT: 7, REF: 7, DEX: 6, TECH: 4, COOL: 6, WILL: 6, LUCK: 6, MOVE: 7, BODY: 7, EMP: 4 },
          { roll: 10, INT: 7, REF: 8, DEX: 5, TECH: 4, COOL: 6, WILL: 7, LUCK: 6, MOVE: 7, BODY: 7, EMP: 4 },
        ],
      },
      edgerunner: {
        descricao:
          'Recebe 86 pontos para distribuir entre as habilidades listadas. Nenhuma habilidade pode ultrapassar nivel 6 ou ser inferior a 2.',
        listaHabilidades: [
          'Atletismo',
          'Briga',
          'Concentracao',
          'Conversacao',
          'Educacao',
          'Evasao',
          'Primeiros Socorros',
          'Percepcao Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepcao',
          'Persuasao',
          'Furtividade',
          'Disparo Automatico (x2)',
          'Armas de uma Mao',
          'Interrogatorio',
          'Armas Brancas',
          'Resistir Tortura/Drogas',
          'Armas de Ombro',
          'Taticas',
        ],
        habilidadesObrigatoriasMinimo2: [
          'Atletismo',
          'Briga',
          'Concentracao',
          'Conversacao',
          'Educacao',
          'Evasao',
          'Primeiros Socorros',
          'Percepcao Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepcao',
          'Persuasao',
          'Furtividade',
        ],
      },
      pacoteCompleto: {
        descricao: 'Constroi o personagem do zero com pontos.',
        regras: {
          pontosEstatisticas: 62,
          minimoEstatistica: 2,
          maximoEstatistica: 8,
          pontosHabilidade: 86,
          dinheiroInicial: 2550,
          dinheiroModaExtra: 800,
        },
        habilidadesObrigatoriasMinimo2: [
          'Atletismo',
          'Briga',
          'Concentracao',
          'Conversacao',
          'Educacao',
          'Evasao',
          'Primeiros Socorros',
          'Percepcao Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepcao',
          'Persuasao',
          'Furtividade',
        ],
      },
    },
    equipamentoInicial: {
      armasEArmadura: [
        { item: 'Rifle de Assalto', quantidade: 1 },
        { item: 'Pistola Muito Pesada', quantidade: 1 },
        { item: 'Arma Branca Pesada', quantidade: 1 },
        { item: 'Municao Basica de Pistola Muito Pesada', quantidade: 30 },
        { item: 'Municao Basica de Rifle', quantidade: 70 },
        { item: 'Armadura Corporal Blindagem Leve', sp: 11 },
        { item: 'Armadura de Cabeca Blindagem Leve', sp: 11 },
        { item: 'Dinheiro extra', quantidade: 500 },
      ],
    },
    lifepathEspecifico: {
      tipoSolo: [
        { roll: 1, tipo: 'Guarda-costas' },
        { roll: 2, tipo: 'Mercenario da Rua' },
        { roll: 3, tipo: 'Capanga corporativo que assume servicos por fora' },
        { roll: 4, tipo: 'Agente corporativo ou freelance Black Ops' },
        { roll: 5, tipo: 'Vigilante local para contratar' },
        { roll: 6, tipo: 'Assassino/Matador de aluguel' },
      ],
      bussolaMoral: [
        { roll: 1, descricao: "Sempre trabalhando para o bem, tentando acabar os 'bandidos'." },
        { roll: 2, descricao: 'Sempre poupar os inocentes (idosos, mulheres, criancas, animais de estimacao).' },
        { roll: 3, descricao: 'Ocasionalmente vacila e faz coisas antieticas ou mas, mas e raro.' },
        {
          roll: 4,
          descricao:
            'Implacavel e centrado no Lucro; voce vai trabalhar para qualquer um, tomar qualquer trabalho pelo dinheiro.',
        },
        { roll: 5, descricao: 'Disposto a burlar as regras (e a lei) para fazer o trabalho.' },
        {
          roll: 6,
          descricao:
            'Totalmente maligno. Voce se envolve em trabalho ilegal e anti-etico o tempo todo; de fato, voce se diverte.',
        },
      ],
      quemEstaAtras: [
        { roll: 1, descricao: 'Uma corporacao que voce pode ter irritado.' },
        { roll: 2, descricao: 'Um membro de gangue aprimorado que voce enfrentou.' },
        {
          roll: 3,
          descricao:
            'Homens da lei corruptos ou homens da lei que pensam erradamente que voce e culpado de algo.',
        },
        { roll: 4, descricao: 'Um rival Solo de outra corporacao.' },
        { roll: 5, descricao: 'Um Fixer que te ve como uma ameaca.' },
        { roll: 6, descricao: 'Um rival Solo que te ve como seu arqui-inimigo.' },
      ],
      territorioOperacional: [
        { roll: 1, descricao: 'Uma zona corporativa' },
        { roll: 2, descricao: 'Zonas de combate' },
        { roll: 3, descricao: 'Toda a cidade' },
        { roll: 4, descricao: 'O territorio de uma unica corporacao' },
        { roll: 5, descricao: 'O territorio particular de um Fixer ou contato' },
        { roll: 6, descricao: 'Onde quer que o dinheiro te leve' },
      ],
    },
    exemploPersonagem: {
      papel: 'Solo',
      nome: "Jay 'Cromado' Guyser",
      handle: 'Cromado',
      estatisticas: {
        INT: 5,
        REF: 8,
        DEX: 6,
        TECH: 4,
        COOL: 7,
        WILL: 6,
        LUCK: 5,
        MOVE: 6,
        BODY: 7,
        EMP: 5,
      },
      rankHabilidadePapel: 4,
      habilidades: {
        Atletismo: 4,
        Briga: 6,
        Concentracao: 2,
        Conversacao: 2,
        Educacao: 4,
        Evasao: 6,
        'Primeiros Socorros': 4,
        'Percepcao Humana': 4,
        'Linguagem (Linguagem de Rua)': 4,
        'Linguagem (Baseada na Origem Cultural)': 4,
        'Especialista Local (Sua Casa)': 4,
        Percepcao: 6,
        Persuasao: 4,
        Furtividade: 6,
        'Disparo Automatico (x2)': 2,
        'Armas de uma Mao': 4,
        Interrogatorio: 4,
        'Armas Brancas': 6,
        'Resistir Tortura/Drogas': 4,
        'Armas de Ombro': 4,
        Taticas: 4,
      },
      equipamento: {
        armaPrincipal: 'Rifle de Assalto',
        armaSecundaria: 'Pistola Muito Pesada',
        armaCorpoACorpo: 'Arma Branca Pesada',
        municaoPistola: 30,
        municaoRifle: 70,
        armadura: 'Blindagem Leve (SP 11 corpo e cabeca)',
        dinheiroExtra: 500,
        cyberware: ['Link Neural', 'Sandevistan Speedware'],
        outrosItens: [
          'Binoculos',
          'Celular Descartavel',
          'Equipamento de Camping',
          'Bolsa',
          'Lanterna',
          'Cama Inflavel e Saco de Dormir',
          'Kit de Cuidados Pessoais',
          'Corda (60m/yd)',
          'Granada Flash',
          'Granada de Fumaca x2',
        ],
      },
    },
  },
  {
    papel: 'Netrunner',
    descricao:
      'Hackers ciberneticos do mundo pos-NET e ladroes secretos que queimam cerebros. Mestres do cyberverso, trocam o conforto do sofa por um bodyweight combat bodysuit e oculos de virtualidade para invadir arquiteturas NET. Trabalham em equipe com Solos para cobrir suas costas, Medtechs para reiniciar seus coracoes se o ICE os pegar, e Techs para ajudar a fazer hot-wire em seus cyberdecks.',
    habilidadePapel: {
      nome: 'Interface',
      descricao:
        'Permite que o Netrunner interaja com modems mentais eletronicos (cyberdecks) para controlar computadores, eletronicos e programas associados. Determina quantas acoes na NET podem ser realizadas por turno e da acesso a um conjunto de Habilidades de Interface.',
      acoesPorRank: [
        { rank: '1-3', acoesNET: 2 },
        { rank: '4-6', acoesNET: 3 },
        { rank: '7-9', acoesNET: 4 },
        { rank: 10, acoesNET: 5 },
      ],
      habilidadesInterface: [
        {
          nome: 'Backdoor',
          descricao: 'Permite que o Netrunner quebre senhas e outras obstrucoes na arquitetura.',
        },
        {
          nome: 'Cloak',
          descricao: 'Permite ao Netrunner ocultar suas acoes na Arquitetura antes de sair.',
        },
        {
          nome: 'Control',
          descricao:
            'Permite ao Netrunner controlar coisas que estao ligadas a Arquitetura (cameras, drones, torres, elevadores).',
        },
        {
          nome: 'Eye-Dee',
          descricao: 'Permite que o Netrunner saiba o que e um dado encontrado (como um arquivo) e seu valor.',
        },
        {
          nome: 'Pathfinder',
          descricao: 'Permite ao Netrunner conhecer o mapa da Arquitetura.',
        },
        {
          nome: 'Scanner',
          descricao:
            'Permite ao Netrunner encontrar as localizacoes dos sistemas em uma area (usado como Acao Carnal).',
        },
        {
          nome: 'Slide',
          descricao: 'Permite ao Netrunner escapar de um Black ICE que o esta seguindo.',
        },
        {
          nome: 'Virus',
          descricao: 'Permite ao Netrunner deixar um virus personalizado no nucleo da Arquitetura.',
        },
        {
          nome: 'Zap',
          descricao: 'Um ataque basico do Netrunner que funciona contra Programas e outros Netrunners (dano 1d6).',
        },
      ],
    },
    geracaoPersonagem: {
      ratoDeRua: {
        descricao: 'Rolar 1d10 e usar a linha correspondente para as estatisticas.',
        tabelaEstatisticas: [
          { roll: 1, INT: 6, REF: 7, DEX: 7, TECH: 3, COOL: 8, WILL: 6, LUCK: 5, MOVE: 5, BODY: 6, EMP: 5 },
          { roll: 2, INT: 7, REF: 8, DEX: 6, TECH: 3, COOL: 6, WILL: 6, LUCK: 7, MOVE: 5, BODY: 6, EMP: 6 },
          { roll: 3, INT: 5, REF: 8, DEX: 7, TECH: 4, COOL: 7, WILL: 7, LUCK: 6, MOVE: 7, BODY: 8, EMP: 5 },
          { roll: 4, INT: 5, REF: 8, DEX: 6, TECH: 4, COOL: 6, WILL: 7, LUCK: 6, MOVE: 5, BODY: 7, EMP: 6 },
          { roll: 5, INT: 6, REF: 7, DEX: 6, TECH: 5, COOL: 7, WILL: 6, LUCK: 7, MOVE: 5, BODY: 7, EMP: 6 },
          { roll: 6, INT: 7, REF: 7, DEX: 6, TECH: 5, COOL: 6, WILL: 7, LUCK: 7, MOVE: 6, BODY: 6, EMP: 5 },
          { roll: 7, INT: 6, REF: 8, DEX: 7, TECH: 5, COOL: 6, WILL: 7, LUCK: 6, MOVE: 7, BODY: 5, EMP: 6 },
          { roll: 8, INT: 6, REF: 8, DEX: 5, TECH: 4, COOL: 8, WILL: 7, LUCK: 5, MOVE: 6, BODY: 7, EMP: 5 },
          { roll: 9, INT: 7, REF: 7, DEX: 6, TECH: 4, COOL: 6, WILL: 6, LUCK: 6, MOVE: 7, BODY: 7, EMP: 4 },
          { roll: 10, INT: 7, REF: 8, DEX: 5, TECH: 4, COOL: 6, WILL: 7, LUCK: 6, MOVE: 7, BODY: 7, EMP: 4 },
        ],
        habilidadesIniciais: [
          { nome: 'Interface', nivel: 4 },
          { nome: 'Atletismo', nivel: 2 },
          { nome: 'Briga', nivel: 2 },
          { nome: 'Concentracao', nivel: 2 },
          { nome: 'Conversacao', nivel: 2 },
          { nome: 'Educacao', nivel: 6 },
          { nome: 'Evasao', nivel: 6 },
          { nome: 'Primeiros Socorros', nivel: 2 },
          { nome: 'Percepcao Humana', nivel: 2 },
          { nome: 'Linguagem (Linguagem de Rua)', nivel: 2 },
          { nome: 'Especialista Local (Sua Casa)', nivel: 2 },
          { nome: 'Percepcao', nivel: 2 },
          { nome: 'Persuasao', nivel: 2 },
          { nome: 'Furtividade', nivel: 6 },
          { nome: 'Tecnologia Basica', nivel: 6 },
          { nome: 'Esconder/Revelar Objetos', nivel: 6 },
          { nome: 'Criptografia', nivel: 6 },
          { nome: 'Cybertecnologia', nivel: 4 },
          { nome: 'Tecnologia Eletronica/Seguranca (x2)', nivel: 6 },
          { nome: 'Armas de uma Mao', nivel: 6 },
          { nome: 'Pesquisa Bibliotecaria', nivel: 6 },
        ],
      },
      edgerunner: {
        descricao:
          'Recebe 86 pontos para distribuir entre as habilidades listadas. Nenhuma habilidade pode ultrapassar nivel 6 ou ser inferior a 2.',
        listaHabilidades: [
          'Interface',
          'Atletismo',
          'Briga',
          'Concentracao',
          'Conversacao',
          'Educacao',
          'Evasao',
          'Primeiros Socorros',
          'Percepcao Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepcao',
          'Persuasao',
          'Furtividade',
          'Tecnologia Basica',
          'Esconder/Revelar Objetos',
          'Criptografia',
          'Cybertecnologia',
          'Tecnologia Eletronica/Seguranca (x2)',
          'Armas de uma Mao',
          'Pesquisa Bibliotecaria',
        ],
        habilidadesObrigatoriasMinimo2: [
          'Interface',
          'Atletismo',
          'Briga',
          'Concentracao',
          'Conversacao',
          'Educacao',
          'Evasao',
          'Primeiros Socorros',
          'Percepcao Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepcao',
          'Persuasao',
          'Furtividade',
        ],
      },
      pacoteCompleto: {
        descricao: 'Constroi o personagem do zero com pontos.',
        regras: {
          pontosEstatisticas: 62,
          minimoEstatistica: 2,
          maximoEstatistica: 8,
          pontosHabilidade: 86,
          dinheiroInicial: 2550,
          dinheiroModaExtra: 800,
        },
        habilidadesObrigatoriasMinimo2: [
          'Interface',
          'Atletismo',
          'Briga',
          'Concentracao',
          'Conversacao',
          'Educacao',
          'Evasao',
          'Primeiros Socorros',
          'Percepcao Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepcao',
          'Persuasao',
          'Furtividade',
        ],
      },
    },
    equipamentoInicial: {
      armasEArmadura: [
        { item: 'Pistola Muito Pesada', quantidade: 1 },
        { item: 'Municao Basica de Pistola Muito Pesada', quantidade: 50 },
        { item: 'Armadura Corporal Blindagem Leve', sp: 11 },
        { item: 'Armadura de Cabeca Blindagem Leve', sp: 11 },
        { item: 'Agente', quantidade: 1 },
        { item: 'Cyberdeck (7 slots)', quantidade: 1 },
        { item: 'Oculos de Virtualidade', quantidade: 1 },
        { item: 'Dinheiro extra', quantidade: 500 },
      ],
      programasCyberdeck: [
        { nome: 'Sword', quantidade: 2 },
        { nome: 'Killer', quantidade: 1 },
        { nome: 'Worm', quantidade: 2 },
        { nome: 'Armor', quantidade: 1 },
      ],
    },
    lifepathEspecifico: {
      tipoNetrunner: [
        { roll: 1, tipo: 'Freelancer que trabalha por contrato' },
        { roll: 2, tipo: 'Membro de uma equipe fixa de Edgerunners' },
        { roll: 3, tipo: 'Funcionario corporativo (departamento de TI/seguranca)' },
        { roll: 4, tipo: 'Hacktivista lutando por uma causa' },
        { roll: 5, tipo: 'Criminoso especializado em roubo de dados' },
        { roll: 6, tipo: 'Cacador de recompensas digital' },
      ],
      espacoTrabalho: [
        { roll: 1, descricao: 'Baguncado, caotico, cheio de lixo eletronico' },
        { roll: 2, descricao: 'Organizado, limpo, minimalista' },
        { roll: 3, descricao: 'Escondido em local inusitado (porao, telhado, container)' },
        { roll: 4, descricao: 'Movel (dentro de um veiculo, Kombi)' },
        { roll: 5, descricao: 'Confortavel, quase residencial, com varias telas' },
        { roll: 6, descricao: 'Ultra-tecnologico, parecendo o cockpit de uma nave' },
      ],
      clientes: [
        { roll: 1, descricao: 'Fixers locais que lhe enviam clientes' },
        {
          roll: 2,
          descricao: 'Membros de Gangues locais que tambem protegem sua area de trabalho',
        },
        { roll: 3, descricao: "Execs Corporativos que te usam para trabalho em 'Black Projects'" },
        { roll: 4, descricao: 'Solos locais que usam voce para manter sistemas pessoais seguros' },
        {
          roll: 5,
          descricao: 'Nomades e Fixers que usam voce para manter sistemas familiares seguros',
        },
        { roll: 6, descricao: 'Voce trabalha para si mesmo vendendo dados que encontra na NET' },
      ],
      ondeConsegueProgramas: [
        { roll: 1, descricao: 'Escava em antigas Zonas de Cidades abandonadas' },
        { roll: 2, descricao: 'Rouba de outros Netrunners que voce queima o cerebro' },
        { roll: 3, descricao: 'Tem um Fixer local que fornece programas em troca de trabalho' },
        { roll: 4, descricao: 'Execs corporativos fornecem programas em troca de servicos' },
        { roll: 5, descricao: 'Tem acesso aos backdoors de armazens corporativos' },
        { roll: 6, descricao: 'Vai aos mercados noturnos e pechincha programas' },
      ],
      quemEstaAtras: [
        { roll: 1, descricao: 'Voce acha que pode ser uma IA renegada ou um NET Ghost' },
        { roll: 2, descricao: 'Netrunners rivais que simplesmente nao gostam de voce' },
        { roll: 3, descricao: 'Corporativos que querem que voce trabalhe exclusivamente para eles' },
        { roll: 4, descricao: "Lawmen que considera voce um ilegal 'black hat'" },
        { roll: 5, descricao: 'Velhos clientes que pensam que voce os enganou' },
        { roll: 6, descricao: 'Fixer ou outro cliente que quer os seus servicos exclusivamente' },
      ],
    },
    exemploPersonagem: {
      papel: 'Netrunner',
      nome: "Maryam 'Recluse' Kenyatta",
      handle: 'Recluse',
      origemCultural: 'Africa Subsaariana (Etiopia)',
      linguas: ['Amarico (4)', 'Linguagem de Rua (2)'],
      estatisticas: {
        INT: 8,
        REF: 6,
        DEX: 6,
        TECH: 8,
        COOL: 6,
        WILL: 7,
        LUCK: 5,
        MOVE: 5,
        BODY: 5,
        EMP: 4,
      },
      rankHabilidadePapel: 4,
      habilidades: {
        Interface: 4,
        Atletismo: 2,
        Briga: 2,
        Concentracao: 4,
        Conversacao: 4,
        Educacao: 6,
        Evasao: 6,
        'Primeiros Socorros': 2,
        'Percepcao Humana': 4,
        'Linguagem (Linguagem de Rua)': 2,
        'Linguagem (Amarico)': 4,
        'Especialista Local (Kabuki, Watson)': 4,
        Percepcao: 6,
        Persuasao: 2,
        Furtividade: 6,
        'Tecnologia Basica': 6,
        'Esconder/Revelar Objetos': 4,
        Criptografia: 6,
        Cybertecnologia: 4,
        'Tecnologia Eletronica/Seguranca (x2)': 6,
        'Armas de uma Mao': 4,
        'Pesquisa Bibliotecaria': 6,
      },
      cyberware: {
        neuralware: {
          linkNeural: true,
          opcoes: ['Interface Plugs', 'Chipware Socket'],
        },
        cyberopticos: {
          olhoEsquerdo: { slots: 3, opcoes: ['Virtuality'] },
          olhoDireito: { slots: 3, opcoes: ['Virtuality'] },
        },
        fashionware: ['Biomonitor'],
      },
      equipamento: {
        arma: 'Pistola Muito Pesada',
        municao: 50,
        armadura: 'Traje Corporal (SP 11 corpo e cabeca)',
        cyberdeck: {
          qualidade: 'Padrao',
          slots: 7,
          programas: ['Sword', 'Sword', 'Killer', 'Worm', 'Worm', 'Armor'],
        },
        outrosItens: [
          'Agente',
          'Oculos de Virtualidade',
          'Airhypo',
          'Scanner de Mao (Tecnologia Eletronica)',
          'Rastreador',
        ],
        dinheiroExtra: 500,
      },
      lifepath: {
        tipo: 'Freelancer que trabalha por contrato',
        espacoTrabalho: 'Minimalista, limpo e organizado',
        clientes: 'Fixers locais que usam seus servicos para proteger sistemas',
        programas: 'Mercados Noturnos',
        inimigo: 'IA renegada ou NET Ghost que a seguiu da Etiopia',
      },
    },
  },
  {
    papel: 'Tech',
    descricao:
      'Você não pode deixar nada sozinho — se algo fica perto de você por mais de cinco minutos, você o desmonta e o transforma em algo novo. Você é um mecânico renegado, um inventor, a pessoa que faz o futuro sombrio correr. Em um mundo que se recupera de uma guerra que quebrou a espinha da cadeia de suprimentos, você é quem conserta liquidificadores, modifica armas ilegais para Solos, cria equipamentos de espionagem para operações secretas e inventa novas tecnologias a partir de sucata. Você é viciado em tecnologia em todas as suas formas, e isso é o que faz de você um Tec.',
    habilidadePapel: {
      nome: 'Artífice',
      descricao:
        'Usando a Habilidade de Papel Artífice, o Tech pode corrigir, melhorar, modificar, fabricar e inventar novos itens. Sempre que um Tech aumenta o seu Rank de Artífice em 1 ponto, eles ganham uma classificação em duas Especialidades de Artífice diferentes a sua escolha.',
      especialidades: [
        {
          nome: 'Especialização de Campo',
          descricao:
            'Sua familiaridade com a tecnologia no campo faz de você um artigo valioso em qualquer trabalho. Adicione seu Rank nesta especialidade a qualquer verificação de habilidades Tecnologia Básica, Cybertech, Eletrônica/Segurança, Tecnologia de Armas, Tecnologia de Veículos Terrestres, Marítimos ou Aéreos. Além disso, enquanto você tem pelo menos 1 Rank nesta especialidade, em vez de um longo reparo completo, você pode optar por reparar temporariamente o seu alvo (no mesmo DV de um reparo típico) para condição perfeita como uma ação (com SP completo e HP, se aplicável). Este arranjo dura 10 minutos para cada Rank que você tem nesta especialidade, após o que o item retorna ao estado em que estava.',
        },
        {
          nome: 'Especialização de Upgrade',
          descricao:
            'Melhora um item de forma permanente. Um item só pode beneficiar de 1 upgrade concedido por esta especialidade. As melhorias possíveis incluem: diminuir a perda de Humanidade de um cyberware em 1d6; aumentar o número de slots de opções de um item em 1; reduzir pela metade o tempo de reparo de um item; conceder a uma arma de uma mão a capacidade de ser ocultada; aumentar uma arma de qualidade média para excelente; conceder um slot de acessório a uma Arma Exótica; aumentar o SP de um item em 1; ou instalar uma atualização inventada pelo Tech usando a Especialidade em Invenção.',
        },
        {
          nome: 'Especialista em Fabricação',
          descricao:
            'Fabricar um item existente ou um inventado pelo Tech (usando Invenção) a partir de materiais. Para fazer um item, o Tech rola TECH + a habilidade TECH relacionada com o reparo do item + seu Rank nesta especialidade + 1d10. O Tech deve comprar materiais de uma categoria de preço inferior à categoria de preço do item que está sendo fabricado. Em uma verificação falhada, no meio do processo, você percebe que vai ter que começar de novo do zero, mas os materiais não são perdidos.',
        },
        {
          nome: 'Especialização em Invenções',
          descricao:
            'Invente uma atualização para um item existente ou invente um item inteiramente novo. Para inventar, você precisará descrever ao seu GM a função desejada do seu item/upgrade. Se o GM estiver satisfeito, ele definirá a categoria de preço do item (nunca inferior a CARO), o DV e o tempo necessários para a invenção, com base na tabela de custos. Uma vez inventado, você (ou outro Tech) pode fabricá-lo usando a especialidade Fabricação.',
        },
      ],
      upgradeFabricacaoInvencaoDVTempo: [
        { custo: 'Barato/Quotidiano', dv: 9, tempo: '1 hora' },
        { custo: 'Oneroso', dv: 13, tempo: '6 horas' },
        { custo: 'Premium', dv: 17, tempo: '1 dia' },
        { custo: 'Caro', dv: 21, tempo: '1 semana' },
        { custo: 'Muito Caro', dv: 24, tempo: '2 semanas' },
        { custo: 'Luxuoso', dv: 29, tempo: '1 mês' },
        { custo: 'Super Luxuoso', dv: 29, tempo: '1 mês para cada 10.000eb de Custo' },
      ],
    },
    geracaoPersonagem: {
      ratoDeRua: {
        descricao: 'Rolar 1d10 e usar a linha correspondente para as estatísticas.',
        tabelaEstatisticas: [
          { roll: 1, INT: 6, REF: 7, DEX: 7, TECH: 8, COOL: 4, WILL: 4, LUCK: 5, MOVE: 5, BODY: 7, EMP: 6 },
          { roll: 2, INT: 7, REF: 6, DEX: 6, TECH: 7, COOL: 5, WILL: 3, LUCK: 7, MOVE: 5, BODY: 7, EMP: 5 },
          { roll: 3, INT: 5, REF: 5, DEX: 3, TECH: 8, COOL: 6, WILL: 5, LUCK: 4, MOVE: 7, BODY: 7, EMP: 5 },
          { roll: 4, INT: 7, REF: 7, DEX: 4, TECH: 7, COOL: 4, WILL: 4, LUCK: 6, MOVE: 5, BODY: 6, EMP: 7 },
          { roll: 5, INT: 6, REF: 6, DEX: 7, TECH: 6, COOL: 4, WILL: 3, LUCK: 7, MOVE: 7, BODY: 6, EMP: 6 },
          { roll: 6, INT: 7, REF: 7, DEX: 8, TECH: 6, COOL: 3, WILL: 3, LUCK: 7, MOVE: 7, BODY: 5, EMP: 4 },
          { roll: 7, INT: 6, REF: 7, DEX: 6, TECH: 8, COOL: 6, WILL: 6, LUCK: 5, MOVE: 7, BODY: 4, EMP: 4 },
          { roll: 8, INT: 7, REF: 7, DEX: 6, TECH: 8, COOL: 7, WILL: 4, LUCK: 4, MOVE: 5, BODY: 4, EMP: 5 },
          { roll: 9, INT: 6, REF: 7, DEX: 6, TECH: 6, COOL: 3, WILL: 3, LUCK: 5, MOVE: 7, BODY: 7, EMP: 7 },
          { roll: 10, INT: 8, REF: 5, DEX: 6, TECH: 8, COOL: 4, WILL: 4, LUCK: 5, MOVE: 5, BODY: 6, EMP: 6 },
        ],
        habilidadesIniciais: [
          { nome: 'Artífice', nivel: 4 },
          { nome: 'Atletismo', nivel: 2 },
          { nome: 'Briga', nivel: 2 },
          { nome: 'Concentração', nivel: 2 },
          { nome: 'Conversação', nivel: 2 },
          { nome: 'Educação', nivel: 6 },
          { nome: 'Evasão', nivel: 6 },
          { nome: 'Primeiros Socorros', nivel: 2 },
          { nome: 'Percepção Humana', nivel: 2 },
          { nome: 'Linguagem (Linguagem de Rua)', nivel: 2 },
          { nome: 'Especialista Local (Sua Casa)', nivel: 2 },
          { nome: 'Percepção', nivel: 2 },
          { nome: 'Persuasão', nivel: 2 },
          { nome: 'Furtividade', nivel: 2 },
          { nome: 'Tecnologia Básica', nivel: 6 },
          { nome: 'Cybertecnologia', nivel: 6 },
          { nome: 'Tecnologia Eletrônica/Segurança (x2)', nivel: 6 },
          { nome: 'Tecnologia de Veículos Terrestres', nivel: 6 },
          { nome: 'Armas de uma Mão', nivel: 6 },
          { nome: 'Ciências (escolha 1)', nivel: 6 },
        ],
      },
      edgerunner: {
        descricao:
          'Recebe 86 pontos para distribuir entre as habilidades listadas. Nenhuma habilidade pode ultrapassar nível 6 ou ser inferior a 2.',
        listaHabilidades: [
          'Artífice',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
          'Tecnologia Básica',
          'Cybertecnologia',
          'Tecnologia Eletrônica/Segurança (x2)',
          'Tecnologia de Veículos Terrestres',
          'Armas de uma Mão',
          'Ciências (escolha 1)',
        ],
        habilidadesObrigatoriasMinimo2: [
          'Artífice',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
        ],
      },
      pacoteCompleto: {
        descricao: 'Constrói o personagem do zero com pontos.',
        regras: {
          pontosEstatisticas: 62,
          minimoEstatistica: 2,
          maximoEstatistica: 8,
          pontosHabilidade: 86,
          dinheiroInicial: 2550,
          dinheiroModaExtra: 800,
        },
        habilidadesObrigatoriasMinimo2: [
          'Artífice',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
        ],
      },
    },
    equipamentoInicial: {
      armasEArmadura: [
        { item: 'Pistola Muito Pesada', quantidade: 1 },
        { item: 'Munição Básica de Pistola Muito Pesada', quantidade: 50 },
        { item: 'Armadura Corporal Blindagem Leve', sp: 11 },
        { item: 'Armadura de Cabeça Blindagem Leve', sp: 11 },
        { item: 'Agente', quantidade: 1 },
        { item: 'Ferramentas Embutidas (Cyberware)', quantidade: 1 },
        { item: 'Conjunto Cyberaudio', quantidade: 1 },
        { item: 'Opções Cyberaudio: Agente Interno, Detector de Erros, Gravador de Áudio' },
        { item: 'Dinheiro extra', quantidade: 500 },
      ],
    },
    lifepathEspecifico: {
      tipoTech: [
        { roll: 1, tipo: 'Mecânico de veículos (terrestres, aéreos ou marítimos)' },
        { roll: 2, tipo: 'Especialista em armas (armas de fogo, corpo a corpo, exóticas)' },
        { roll: 3, tipo: 'Especialista em eletrônica e segurança (alarmes, câmeras, fechaduras)' },
        { roll: 4, tipo: 'Cibernético (especialista em instalar e modificar cyberware)' },
        { roll: 5, tipo: 'Engenheiro químico (explosivos, drogas, ácidos)' },
        { roll: 6, tipo: 'Invenções (cria coisas novas a partir de sucata)' },
        { roll: 7, tipo: 'Ladrão de túmulos tecnológico (recupera tech de zonas abandonadas)' },
        { roll: 8, tipo: 'Engenheiro de demolições' },
        { roll: 9, tipo: 'Artista (pintura, escultura, música) com um pé na tecnologia' },
        { roll: 10, tipo: 'Cientista louco (biológico, químico, ou físico)' },
      ],
      localTrabalho: [
        { roll: 1, descricao: 'Oficina bagunçada em um container na Zona de Combate' },
        { roll: 2, descricao: 'Espaço alugado em uma garagem comunitária nos subúrbios' },
        { roll: 3, descricao: 'Laboratório improvisado no porão de um prédio abandonado' },
        { roll: 4, descricao: 'Oficina móvel dentro de uma Kombi ou caminhão' },
        { roll: 5, descricao: 'Banca em um Mercado Noturno fixo' },
        { roll: 6, descricao: 'Um espaço limpo e organizado em um cube hotel (surpreendentemente)' },
      ],
      clientes: [
        { roll: 1, descricao: 'Fixers locais que lhe enviam clientes' },
        { roll: 2, descricao: 'Gangers locais que também protegem sua área de trabalho ou casa' },
        { roll: 3, descricao: "Execs corporativos que te usam para trabalho em um 'black project'" },
        { roll: 4, descricao: 'Solos locais ou outros tipos de combatentes que o usam para manutenção de armas' },
        { roll: 5, descricao: "Nômades e Fixers locais que trazem 'achados' tecnológicos para consertar" },
        { roll: 6, descricao: 'Você trabalha para si mesmo e vende o que você inventa/conserta' },
      ],
      ondeConsegueSuprimentos: [
        { roll: 1, descricao: 'Vasculha os destroços em zonas de cidade abandonada' },
        { roll: 2, descricao: 'Retira equipamentos dos corpos após os tiroteios' },
        { roll: 3, descricao: 'Tem um Fixer local que traz suprimentos em troca de reparos' },
        { roll: 4, descricao: 'Execs corporativos fornecem coisas em troca de seus serviços' },
        { roll: 5, descricao: 'Tem a porta dos fundos de alguns armazéns corporativos' },
        { roll: 6, descricao: 'Você vai aos mercados noturnos e pechincha sempre que pode' },
      ],
      quemEstaAtras: [
        { roll: 1, descricao: 'Gangues de zona de combate que querem que você trabalhe exclusivamente para eles' },
        { roll: 2, descricao: 'Um Tech rival tentando roubar seus clientes' },
        { roll: 3, descricao: 'Corporativos que querem que você trabalhe para eles exclusivamente' },
        { roll: 4, descricao: 'Um fabricante grande quer te derrubar porque suas modificações são uma ameaça' },
        { roll: 5, descricao: 'Um velho cliente que pensa que você o enganou' },
        { roll: 6, descricao: 'Um Tech rival que quer te derrubar por recursos e peças' },
      ],
    },
    exemploPersonagem: {
      papel: 'Tech',
      nome: "João 'Conserta Tudo' Silva",
      handle: 'Torch',
      origemCultural: 'América do Sul (Brasil)',
      linguas: ['Português (4)', 'Linguagem de Rua (2)'],
      estatisticas: {
        INT: 7,
        REF: 6,
        DEX: 6,
        TECH: 8,
        COOL: 5,
        WILL: 6,
        LUCK: 4,
        MOVE: 5,
        BODY: 7,
        EMP: 5,
      },
      rankHabilidadePapel: 4,
      especialidadesArtifice: ['Especialização de Campo', 'Especialização de Upgrade'],
      habilidades: {
        Artífice: 4,
        Atletismo: 2,
        Briga: 2,
        Concentração: 4,
        Conversação: 4,
        Educação: 6,
        Evasão: 4,
        'Primeiros Socorros': 4,
        'Percepção Humana': 4,
        'Linguagem (Linguagem de Rua)': 2,
        'Linguagem (Português)': 4,
        'Especialista Local (Santo Domingo, Heywood)': 4,
        Percepção: 4,
        Persuasão: 4,
        Furtividade: 4,
        'Tecnologia Básica': 6,
        Cybertecnologia: 6,
        'Tecnologia Eletrônica/Segurança (x2)': 6,
        'Tecnologia de Veículos Terrestres': 6,
        'Armas de uma Mão': 4,
        'Ciências (Química)': 4,
        'Demolições (x2)': 2,
        'Tecnologia de Armas': 4,
      },
      cyberware: {
        neuralware: {
          linkNeural: true,
          opcoes: ['Chipware Socket'],
        },
        cyberaudio: {
          suite: true,
          opcoes: ['Internal Agent', 'Bug Detector'],
        },
        cyberbraco: {
          bracoDireito: {
            instalado: true,
            opcoes: ['Tool Hand', 'Techscanner'],
          },
        },
        cyberopticos: {
          olhoEsquerdo: { slots: 3, opcoes: ['MicroOptics'] },
        },
      },
      equipamento: {
        arma: 'Pistola Média (Ferramenta, não para matar)',
        municao: 20,
        armadura: 'Blindagem Leve (SP 11 corpo e cabeça)',
        ferramentas: ['Tech Bag', 'Lock Picking Set', 'Químico Analyzer (se tiver acesso)'],
        outrosItens: ['Agente', 'Lanterna', 'Duct Tape', 'Cordas', 'Medtech Bag (para primeiros socorros)', 'MREs x5'],
        dinheiroExtra: 230,
      },
      lifepath: {
        tipo: 'Cibernético (especialista em instalar e modificar cyberware)',
        localTrabalho: 'Oficina bagunçada em um container na Zona de Combate (Santo Domingo)',
        clientes: 'Fixers locais que lhe enviam clientes (principalmente para consertos de cyberware)',
        suprimentos: 'Tem um Fixer local que traz suprimentos em troca de reparos',
        inimigo: 'Um Tech rival tentando roubar seus clientes',
      },
    },
  },
  {
    papel: 'Medtech',
    descricao:
      'Você é um artista, e o corpo humano é sua tela. Você tem as melhores ferramentas que o Tempo do Vermelho pode oferecer, e sabe como usá-las. Se teve sorte, frequentou uma das verdadeiras escolas de medicina espalhadas pelos destroços do Velho Estados Unidos. Ou talvez tenha aprendido em hospitais militares durante a Guerra, ajudando a segurar pacientes aos gritos e a emendar cyberware em corpos mutilados. Talvez um velho estripador tenha te treinado. Agora, você trata dos feridos, cura os doentes e mantém os locais vivos — por amor, compromisso, ou por um grande pagamento. Se tiver sorte, conseguiu um lugar na Trauma Team, operando a partir de um AV-4 e salvando vidas (ou cobrando por isso). Você é um Medtech.',
    habilidadePapel: {
      nome: 'Medicina',
      descricao:
        'Com essa habilidade, os Medtechs podem manter vivas pessoas que deveriam estar mortas com seus conhecimentos, ferramentas e treinamento. No Tempo do Vermelho, eles são tanto médicos quanto mecânicos, cuidando de pessoas que são muitas vezes mais máquinas do que humanos. Sempre que o Medtech aumenta seu Rank de Medicina, eles também escolhem uma das três especialidades para alocar um único ponto.',
      especialidades: [
        {
          nome: 'Cirurgia',
          descricao:
            'Para cada ponto alocado para a Cirurgia, você ganha 2 pontos na Habilidade Cirúrgica (até um máximo de 10). A habilidade de cirurgia é a habilidade TECH usada para tratar as lesões críticas mais severas, assim como implantar cyberware, e está somente disponível aos Medtechs com esta especialidade.',
        },
        {
          nome: 'Tecnologia Médica (Fármacos)',
          descricao:
            'Para cada ponto alocado em Fármacos, você ganha 1 ponto na Habilidade Tecnologia Médica (até um máximo de 10). A Habilidade Tecnologia Médica é a habilidade Tecnológica usada para operar, entender e reparar máquinas médicas. Você só pode alocar um máximo de 5 pontos nesta especialidade. Cada vez que alocar um ponto, você ganha acesso a um medicamento que pode sintetizar rolando uma verificação de Tecnologia Médica DV13, desperdiçando os materiais em uma falha.',
          farmacos: [
            {
              nome: 'Antibiótico',
              efeito:
                'Quando injetado, um alvo que já começou o processo de cura natural cura 2 pontos de Vida extras todos os dias por uma semana. Uma pessoa só pode se beneficiar de 1 antibiótico de cada vez.',
            },
            {
              nome: 'Rapidetox',
              efeito:
                'Quando injetado, um alvo que é afetado por uma droga, veneno ou intoxicante é imediatamente purgado dos efeitos dessa substância.',
            },
            {
              nome: 'Speedheal',
              efeito:
                'Quando injetado, um alvo que não está no estado de mortalmente ferido, imediatamente cura uma quantidade de HP igual a seu BODY + WILL. Uma pessoa só pode se beneficiar de 1 Speedheal por dia.',
            },
            {
              nome: 'Stim',
              efeito:
                'Quando injetado, um alvo pode ignorar todas as penalidades do estado Gravemente Ferido por uma hora. Uma pessoa só pode se beneficiar de 1 Stim por dia.',
            },
            {
              nome: 'Surge',
              efeito:
                'Quando injetado, um alvo pode funcionar sem parar e sem dormir por 24 horas. Uma pessoa só pode se beneficiar de 1 Surge por semana.',
            },
          ],
        },
        {
          nome: 'Tecnologia Médica (Operação de Criosistemas)',
          descricao:
            'Para cada ponto alocado, você ganha 1 ponto na habilidade Tecnologia Médica (até um máximo de 10). Você só pode colocar um máximo de 5 pontos nesta especialidade. Quando aloca pontos, você também obtém benefícios:',
          beneficios: [
            { nivel: 1, descricao: 'Ganha um Cryopump.' },
            {
              nivel: 2,
              descricao:
                'Torna-se um Técnico Registrado da Cryotank e obtém acesso ilimitado 24/7 a 1 Cryotank de cada vez em qualquer instalação cryotank operada por corporações médicas ou agências governamentais.',
            },
            { nivel: 3, descricao: 'Ganha 1 Cryotank, instalado em uma sala da sua escolha.' },
            {
              nivel: 4,
              descricao:
                'Ganha mais 2 Cryotanks que podem caber na mesma sala que o seu primeiro, e seu Cryopump tem 2 cargas e capacidade para 2 pessoas em estase.',
            },
            {
              nivel: 5,
              descricao:
                'Ganha mais 3 Cryotanks que podem caber na mesma sala que os primeiros três, e seu Cryopump tem 3 cargas e capacidade para três pessoas em estase.',
            },
          ],
        },
      ],
    },
    geracaoPersonagem: {
      ratoDeRua: {
        descricao: 'Rolar 1d10 e usar a linha correspondente para as estatísticas.',
        tabelaEstatisticas: [
          { roll: 1, INT: 7, REF: 5, DEX: 6, TECH: 7, COOL: 5, WILL: 5, LUCK: 3, MOVE: 5, BODY: 7, EMP: 5 },
          { roll: 2, INT: 6, REF: 7, DEX: 7, TECH: 7, COOL: 4, WILL: 6, LUCK: 7, MOVE: 7, BODY: 7, EMP: 5 },
          { roll: 3, INT: 6, REF: 5, DEX: 5, TECH: 8, COOL: 5, WILL: 3, MOVE: 5, BODY: 8, EMP: 5 },
          { roll: 4, INT: 5, REF: 8, DEX: 5, TECH: 7, COOL: 8, WILL: 4, LUCK: 8, MOVE: 7, BODY: 6, EMP: 8 },
          { roll: 5, INT: 6, REF: 6, DEX: 5, TECH: 7, COOL: 5, WILL: 6, LUCK: 7, MOVE: 5, BODY: 7, EMP: 5 },
          { roll: 6, INT: 7, REF: 7, DEX: 6, TECH: 6, COOL: 5, WILL: 8, LUCK: 5, MOVE: 7, BODY: 6, EMP: 5 },
          { roll: 7, INT: 6, REF: 5, DEX: 6, TECH: 8, COOL: 6, WILL: 7, LUCK: 8, MOVE: 5, BODY: 7, EMP: 5 },
          { roll: 8, INT: 8, REF: 7, DEX: 7, TECH: 6, COOL: 5, WILL: 7, LUCK: 5, MOVE: 8, BODY: 7, EMP: 6 },
          { roll: 9, INT: 6, REF: 6, DEX: 7, TECH: 7, COOL: 5, WILL: 4, LUCK: 6, MOVE: 5, BODY: 6, EMP: 6 },
          { roll: 10, INT: 8, REF: 7, DEX: 6, TECH: 6, COOL: 3, WILL: 4, LUCK: 8, MOVE: 7, BODY: 6, EMP: 7 },
        ],
        habilidadesIniciais: [
          { nome: 'Medicina', nivel: 4 },
          { nome: 'Atletismo', nivel: 2 },
          { nome: 'Briga', nivel: 2 },
          { nome: 'Concentração', nivel: 2 },
          { nome: 'Conversação', nivel: 6 },
          { nome: 'Educação', nivel: 6 },
          { nome: 'Evasão', nivel: 6 },
          { nome: 'Primeiros Socorros', nivel: 6 },
          { nome: 'Percepção Humana', nivel: 6 },
          { nome: 'Linguagem (Linguagem de Rua)', nivel: 2 },
          { nome: 'Especialista Local (Sua Casa)', nivel: 2 },
          { nome: 'Percepção', nivel: 2 },
          { nome: 'Persuasão', nivel: 2 },
          { nome: 'Furtividade', nivel: 2 },
          { nome: 'Tecnologia Básica', nivel: 6 },
          { nome: 'Cybertecnologia', nivel: 4 },
          { nome: 'Tecnologia de Veículos Terrestres', nivel: 6 },
          { nome: 'Paramedico (x2)', nivel: 6 },
          { nome: 'Resistir Tortura/Drogas', nivel: 4 },
          { nome: 'Ciências (escolha 1)', nivel: 6 },
        ],
      },
      edgerunner: {
        descricao:
          'Recebe 86 pontos para distribuir entre as habilidades listadas. Nenhuma habilidade pode ultrapassar nível 6 ou ser inferior a 2.',
        listaHabilidades: [
          'Medicina',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
          'Tecnologia Básica',
          'Cybertecnologia',
          'Tecnologia de Veículos Terrestres',
          'Paramedico (x2)',
          'Resistir Tortura/Drogas',
          'Ciências (escolha 1)',
        ],
        habilidadesObrigatoriasMinimo2: [
          'Medicina',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
        ],
      },
      pacoteCompleto: {
        descricao: 'Constrói o personagem do zero com pontos.',
        regras: {
          pontosEstatisticas: 62,
          minimoEstatistica: 2,
          maximoEstatistica: 8,
          pontosHabilidade: 86,
          dinheiroInicial: 2550,
          dinheiroModaExtra: 800,
        },
        habilidadesObrigatoriasMinimo2: [
          'Medicina',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
        ],
      },
    },
    equipamentoInicial: {
      armasEArmadura: [
        { item: 'Pistola Média', quantidade: 1 },
        { item: 'Munição Básica de Pistola Média', quantidade: 50 },
        { item: 'Armadura Corporal Blindagem Leve', sp: 11 },
        { item: 'Armadura de Cabeça Blindagem Leve', sp: 11 },
        { item: 'Agente', quantidade: 1 },
        { item: 'Medtech Bag', quantidade: 1 },
        { item: 'Airhypo', quantidade: 1 },
        { item: 'Cyberware: Nasal Filters', quantidade: 1 },
        { item: 'Dinheiro extra', quantidade: 500 },
      ],
    },
    lifepathEspecifico: {
      tipoMedtech: [
        { roll: 1, tipo: 'Médico de rua (Ripperdoc) que opera em uma clínica escondida' },
        { roll: 2, tipo: 'Ex-militar que serviu como paramédico em zonas de combate' },
        { roll: 3, tipo: 'Médico corporativo que se demitiu (ou foi demitido) e agora trabalha por conta própria' },
        { roll: 4, tipo: 'Pesquisador farmacêutico que desenvolve e testa novas drogas' },
        { roll: 5, tipo: 'Paramédico da Trauma Team (ou aspirante) acostumado a operar sob fogo' },
        { roll: 6, tipo: 'Cirurgião especializado em implantes de cyberware e regeneração' },
        { roll: 7, tipo: 'Estudante de medicina que aprendeu na prática durante a guerra' },
        { roll: 8, tipo: 'Curandeiro tradicional que mescla conhecimentos antigos com tecnologia' },
        { roll: 9, tipo: 'Especialista em química e toxicologia' },
        { roll: 10, tipo: 'Coletor de órgãos que aprendeu medicina para valorizar sua \'colheita\'' },
      ],
      clientes: [
        { roll: 1, descricao: 'Fixers locais que lhe enviam clientes' },
        { roll: 2, descricao: 'Gangues locais que também protegem sua área de trabalho ou casa em troca de ajuda médica' },
        { roll: 3, descricao: "Execs corporativos que te usam em 'Black projects' de trabalho médico" },
        { roll: 4, descricao: 'Solos locais ou outros tipos de combatentes que usam você para ter ajuda médica' },
        { roll: 5, descricao: 'Nômades e Fixers locais que trazem clientes feridos' },
        { roll: 6, descricao: 'Paramédicos do Trauma Team (trabalho temporário ou parceria)' },
      ],
      ondeConsegueSuprimentos: [
        { roll: 1, descricao: 'Vasculhando esconderijos de suprimentos médicos em zonas de cidades abandonadas' },
        { roll: 2, descricao: 'Retira partes dos corpos após os tiroteios (cyberware, órgãos)' },
        { roll: 3, descricao: 'Tem um Fixer local que traz suprimentos em troca de trabalho médico' },
        { roll: 4, descricao: 'Execs Corporativos ou Trauma Team fornecem suprimentos em troca de serviços' },
        { roll: 5, descricao: 'Tem a porta dos fundos de alguns armazéns corporativos ou do hospital' },
        { roll: 6, descricao: 'Você vai aos mercados noturnos e pechincha sempre que pode' },
      ],
      quemEstaAtras: [
        { roll: 1, descricao: 'Um cliente que morreu na sua mesa e cuja família quer vingança' },
        { roll: 2, descricao: 'Uma corporação que descobriu que você está vendendo informações de pacientes' },
        { roll: 3, descricao: 'Um Medtech rival que quer seu território ou sua clientela' },
        { roll: 4, descricao: 'A lei, por prática ilegal da medicina sem licença adequada' },
        { roll: 5, descricao: 'Uma gangue que acha que você deveria trabalhar para eles de graça' },
        { roll: 6, descricao: 'Um paciente que você curou... e que agora te vê como uma dívida a ser cobrada' },
      ],
    },
    exemploPersonagem: {
      papel: 'Medtech',
      nome: "Virgil 'Redtail' Martinez",
      handle: 'Redtail',
      origemCultural: 'América do Norte (Estados Unidos, Badlands)',
      linguas: ['Inglês (4)', 'Linguagem de Rua (2)', 'Espanhol (2)'],
      estatisticas: {
        INT: 7,
        REF: 5,
        DEX: 6,
        TECH: 8,
        COOL: 6,
        WILL: 7,
        LUCK: 4,
        MOVE: 5,
        BODY: 6,
        EMP: 6,
      },
      rankHabilidadePapel: 4,
      especialidadesMedicina: ['Cirurgia (8 pontos)', 'Tecnologia Médica (Fármacos, 2 pontos)'],
      habilidades: {
        Medicina: 4,
        Atletismo: 2,
        Briga: 2,
        Concentração: 4,
        Conversação: 4,
        Educação: 6,
        Evasão: 4,
        'Primeiros Socorros': 6,
        'Percepção Humana': 6,
        'Linguagem (Linguagem de Rua)': 2,
        'Linguagem (Inglês)': 4,
        'Linguagem (Espanhol)': 2,
        'Especialista Local (Badlands, Zonas Nômades)': 4,
        Percepção: 4,
        Persuasão: 4,
        Furtividade: 4,
        'Tecnologia Básica': 4,
        Cybertecnologia: 6,
        'Tecnologia de Veículos Terrestres': 4,
        'Paramedico (x2)': 6,
        'Resistir Tortura/Drogas': 6,
        'Ciências (Biologia)': 6,
      },
      cyberware: {
        neuralware: {
          linkNeural: true,
          opcoes: ['Chipware Socket'],
        },
        cyberaudio: {
          suite: true,
          opcoes: ['Amplified Hearing'],
        },
        cyberopticos: {
          olhoEsquerdo: { slots: 3, opcoes: ['Image Enhance'] },
        },
        internalBody: {
          slots: 2,
          opcoes: ['Enhanced Antibodies', 'Nasal Filters'],
        },
      },
      equipamento: {
        arma: 'Pistola Média',
        municao: 30,
        armadura: 'Kevlar (SP 7 corpo e cabeça)',
        ferramentas: [
          'Medtech Bag',
          'Airhypo (com 2 doses de Stim, 2 de Speedheal, 2 de Rapidetox)',
          'Cryopump (se tiver pontos em Criosistemas)',
        ],
        outrosItens: ['Agente', 'Lanterna', 'Trauma Team Silver Card (assinatura mensal de 500eb)', 'MREs x3'],
        dinheiroExtra: 150,
      },
      lifepath: {
        tipo: 'Ex-militar que serviu como paramédico em zonas de combate (4ª Guerra Corporativa)',
        clientes: 'Nômades e Fixers locais que trazem clientes feridos (por isso fala espanhol)',
        suprimentos: 'Retira partes dos corpos após os tiroteios (com consentimento, claro)',
        inimigo: 'Um Medtech rival que quer seu território (e seus contatos nômades)',
      },
    },
  },
  {
    papel: 'Media',
    descricao:
      'Eles estão distorcendo a verdade lá fora. E você vai pará-los. Alguém tem que fazê-lo. Você tem um vídeo e um passe de imprensa, e não tem medo de usá-los. Você é uma figura da cidade, vista toda a noite no Data Pool no Tempo do Vermelho. Não é como nos velhos tempos, quando você tinha uma grande Mídia corporativa atrás de você; desta vez, você tem que depender de seus fãs, seus contatos, e sua própria reputação. Mas é mais difícil para estes novos Fuzileiros fazer você desaparecer. Então, quando você cavar para baixo para a sujeira e lodo dos funcionários corruptos e cachorrinhos Corporativos, você pode cavar fundo. Na manhã seguinte, você pode colocar os detalhes de seus crimes em todos os screamsheets e vidscreens. Você é um Media.',
    habilidadePapel: {
      nome: 'Credibilidade',
      descricao:
        'A habilidade do papel dos Medias é a Credibilidade. O Media não só pode convencer uma audiência do que eles publicam, mas também tem uma audiência maior quanto mais credível eles são. Eles também têm maiores níveis de acesso a fontes e informações. Medias também conhecem pegam rumores passivamente.',
      rumores: {
        descricao:
          'As medias estão profundamente conectadas às redes de informação. Supondo que você não está totalmente fora do radar, pelo menos duas vezes por semana, o GM secretamente rola seu Rank Credibilidade + 1d10. Se o Teste superar qualquer um dos DVs na coluna Passiva da Tabela Rumor, o GM vai informar o Media sobre o maior rumor DV que seu Teste superar. Esses são os mesmos rumores que a Mídia pode encontrar ao chegar na Rua durante o jogo usando suas habilidades de coleta de informações relevantes.',
        tabela: [
          {
            rumor: 'Vago',
            descricao:
              'O boato é nebuloso. Contém o mínimo de informações necessárias para começar a caçar a suposta verdade no centro dele.',
            dvPassivo: 7,
            dvAtivo: 13,
          },
          {
            rumor: 'Típico',
            descricao:
              'O rumor é suficiente para saber para onde ir a seguir numa investigação. Contém informação suficiente para ter um vislumbre da suposta verdade no seu âmago.',
            dvPassivo: 9,
            dvAtivo: 15,
          },
          {
            rumor: 'Substancial',
            descricao:
              'Como Rumor Típico, mas o rumor também contém informações concretas que beneficiam uma potencial investigação, como nomes, lugares e horários.',
            dvPassivo: 11,
            dvAtivo: 17,
          },
          {
            rumor: 'Detalhado',
            descricao:
              'Como Rumor Substancial, mas o boato também contém informações que, se verificadas, poderia se tornar uma evidência que o Media pode usar em uma história.',
            dvPassivo: 13,
            dvAtivo: 21,
          },
        ],
      },
      publicandoHistorias: {
        descricao:
          'A Credibilidade é uma ferramenta poderosa. Quando você publica uma história, rola 1d10. Se sua história contiver uma única peça de evidência verificável, a chance de seu público acreditar é +1. Se contiver mais de 4 peças verificáveis, a chance é +2. O LUCK nunca pode ser gasto num Teste de Credibilidade.',
        veracidade:
          'Traduz-se em uma chance em 10 do público acreditar na sua história (ex: 2 de 10 = rolar 2 ou menos em 1d10).',
      },
      progressao: [
        {
          rank: '1-2',
          acessoFontes: 'Chefe local, chefe de gangue, liderança de bairro local.',
          audiencia: 'Bairro próximo.',
          veracidade: '2 de 10 chances do público comprar.',
          impacto:
            'A mudança criada por uma história/furo é pequena, incremental. Os bandidos em pouco tempo estarão assustados e podem mudar suas maneiras um pouco.',
        },
        {
          rank: '3-4',
          acessoFontes: 'Gangue dona da Cidade, político menor, Executivo Corp, pessoa bem conhecida no bairro.',
          audiencia: 'Você é bem conhecido como um contribuinte no screamsheet local ou Data Pool.',
          veracidade: '3 de 10 hipóteses do público acreditar.',
          impacto:
            'A mudança criada por uma história/furo tem um efeito direto; em pouco tempo bandidos locais serão presos ou retirados do poder, a justiça será feita.',
        },
        {
          rank: '5-6',
          acessoFontes: 'Maior jogador da Cidade, político da Cidade, Celebridade Local.',
          audiencia:
            'Seu material circula por toda Cidade. Você é um colunista ou colaborador de screamsheets locais ou TV.',
          veracidade: '4 de 10 hipóteses do público acreditar.',
          impacto:
            'Mudança criada por uma história/furo muda as coisas em toda a cidade. bandidos de níveis superiores podem ser presos ou retirados do poder. As leis locais podem até ser aprovadas.',
        },
        {
          rank: '7-8',
          acessoFontes: 'Presidente Corp local, prefeito ou gestor municipal, celebridade da Cidade.',
          audiencia: 'Seu material circula por todo Estado. Você é uma celebridade menor por direito.',
          veracidade: '5 de 10 hipóteses do público acreditar.',
          impacto:
            'Mudança criada por uma história/furo pode mudar as coisas em todas as cidades. Corporações de nível médio ou governos podem ser retirados do poder. Leis que afetam as pessoas podem ser aprovadas em várias cidades.',
        },
        {
          rank: '9',
          acessoFontes: 'Chefe de divisão Corporativa, político, celebridade conhecida.',
          audiencia:
            'Você é conhecido por muitos em todo o país, mas não por todos. Se eles viram você, as chances são de que isto está em um noticiário nacional.',
          veracidade: '6 de 10 hipóteses do público acreditar.',
          impacto:
            'A mudança criada por uma história/furo pode mudar as coisas em toda uma área principal como uma nação inteira. As corporações grandes ou os governos locais podem ser derrubados. Leis que afetam as pessoas podem ser aprovadas em uma área nacional.',
        },
        {
          rank: '10',
          acessoFontes: 'Líder mundial, chefe da grande corporação, celebridade mundialmente famosa.',
          audiencia:
            'Você é conhecido em todo o mundo. As pessoas param para autógrafos e em todos os lugares elas vazam coisas importantes para você.',
          veracidade: '7 de 10 hipóteses do público acreditar.',
          impacto:
            'Mudança criada por uma história/furo pode mudar as coisas em todo o mundo. Megacorps e governos poderosos podem cair ou ser derrubados. Leis internacionais podem ser estabelecidas. A mudança pode afetar milhões.',
        },
      ],
    },
    geracaoPersonagem: {
      ratoDeRua: {
        descricao: 'Rolar 1d10 e usar a linha correspondente para as estatísticas.',
        tabelaEstatisticas: [
          { roll: 1, INT: 6, REF: 6, DEX: 5, TECH: 5, COOL: 8, WILL: 7, LUCK: 5, MOVE: 7, BODY: 5, EMP: 7 },
          { roll: 2, INT: 6, REF: 6, DEX: 6, TECH: 6, COOL: 5, WILL: 6, LUCK: 8, MOVE: 3, BODY: 5, EMP: 6 },
          { roll: 3, INT: 6, REF: 5, DEX: 5, TECH: 7, COOL: 7, WILL: 7, LUCK: 6, MOVE: 5, BODY: 5, EMP: 7 },
          { roll: 4, INT: 6, REF: 5, DEX: 6, TECH: 5, COOL: 7, WILL: 5, LUCK: 6, MOVE: 5, BODY: 6, EMP: 7 },
          { roll: 5, INT: 6, REF: 7, DEX: 6, TECH: 5, COOL: 6, WILL: 6, LUCK: 6, MOVE: 6, BODY: 5, EMP: 7 },
          { roll: 6, INT: 5, REF: 5, DEX: 7, TECH: 5, COOL: 8, WILL: 6, LUCK: 7, MOVE: 5, BODY: 5, EMP: 6 },
          { roll: 7, INT: 5, REF: 5, DEX: 6, TECH: 4, COOL: 8, WILL: 6, LUCK: 7, MOVE: 5, BODY: 5, EMP: 8 },
          { roll: 8, INT: 7, REF: 6, DEX: 5, TECH: 5, COOL: 7, WILL: 6, LUCK: 8, MOVE: 5, BODY: 6, EMP: 6 },
          { roll: 9, INT: 6, REF: 6, DEX: 5, TECH: 6, COOL: 8, WILL: 7, LUCK: 4, MOVE: 6, BODY: 7, EMP: 6 },
          { roll: 10, INT: 7, REF: 6, DEX: 3, TECH: 6, COOL: 7, WILL: 6, LUCK: 7, MOVE: 6, BODY: 7, EMP: 6 },
        ],
        habilidadesIniciais: [
          { nome: 'Credibilidade', nivel: 4 },
          { nome: 'Atletismo', nivel: 2 },
          { nome: 'Briga', nivel: 2 },
          { nome: 'Concentração', nivel: 2 },
          { nome: 'Conversação', nivel: 6 },
          { nome: 'Educação', nivel: 2 },
          { nome: 'Evasão', nivel: 6 },
          { nome: 'Primeiros Socorros', nivel: 2 },
          { nome: 'Percepção Humana', nivel: 6 },
          { nome: 'Linguagem (Linguagem de Rua)', nivel: 2 },
          { nome: 'Especialista Local (Sua Casa)', nivel: 6 },
          { nome: 'Percepção', nivel: 6 },
          { nome: 'Persuasão', nivel: 6 },
          { nome: 'Furtividade', nivel: 2 },
          { nome: 'Subornar', nivel: 6 },
          { nome: 'Composição', nivel: 6 },
          { nome: 'Dedução', nivel: 6 },
          { nome: 'Armas de uma Mão', nivel: 6 },
          { nome: 'Armas Brancas', nivel: 6 },
          { nome: 'Pesquisa Bibliotecária', nivel: 4 },
          { nome: 'Leitura Labial', nivel: 4 },
          { nome: 'Fotografia/Filmagem', nivel: 4 },
        ],
      },
      edgerunner: {
        descricao:
          'Recebe 86 pontos para distribuir entre as habilidades listadas. Nenhuma habilidade pode ultrapassar nível 6 ou ser inferior a 2.',
        listaHabilidades: [
          'Credibilidade',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
          'Subornar',
          'Composição',
          'Dedução',
          'Armas de uma Mão',
          'Armas Brancas',
          'Pesquisa Bibliotecária',
          'Leitura Labial',
          'Fotografia/Filmagem',
        ],
        habilidadesObrigatoriasMinimo2: [
          'Credibilidade',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
        ],
      },
      pacoteCompleto: {
        descricao: 'Constrói o personagem do zero com pontos.',
        regras: {
          pontosEstatisticas: 62,
          minimoEstatistica: 2,
          maximoEstatistica: 8,
          pontosHabilidade: 86,
          dinheiroInicial: 2550,
          dinheiroModaExtra: 800,
        },
        habilidadesObrigatoriasMinimo2: [
          'Credibilidade',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
        ],
      },
    },
    equipamentoInicial: {
      armasEArmadura: [
        { item: 'Pistola Média', quantidade: 1 },
        { item: 'Munição Básica de Pistola Média', quantidade: 50 },
        { item: 'Armadura Corporal Blindagem Leve', sp: 11 },
        { item: 'Armadura de Cabeça Blindagem Leve', sp: 11 },
        { item: 'Agente', quantidade: 1 },
        { item: 'Gravador de Áudio', quantidade: 1 },
        { item: 'Câmera de Vídeo', quantidade: 1 },
        { item: 'Binóculos', quantidade: 1 },
        { item: 'Cyberware: MicroVideo (em um Cybereye)', quantidade: 1 },
        { item: 'Dinheiro extra', quantidade: 500 },
      ],
    },
    lifepathEspecifico: {
      tipoMedia: [
        { roll: 1, tipo: 'Repórter investigativo (focado em escândalos e denúncias)' },
        { roll: 2, tipo: 'Apresentador de TV ou screamsheet (famoso, mas talvez superficial)' },
        { roll: 3, tipo: 'Jornalista independente (freelancer, vende suas histórias para quem pagar mais)' },
        { roll: 4, tipo: 'Fotógrafo de guerra ou de rua (especializado em imagens impactantes)' },
        { roll: 5, tipo: 'Podcaster ou criador de conteúdo para o Data Pool' },
        { roll: 6, tipo: 'Blogueiro de fofocas e celebridades (especializado em escândalos pessoais)' },
      ],
      comoChegaAoPublico: [
        { roll: 1, descricao: 'Screamsheet local (impresso ou digital)' },
        { roll: 2, descricao: 'Canal de TV ou transmissão via satélite' },
        { roll: 3, descricao: 'Data Pool (através de podcasts, vídeos, e artigos)' },
        { roll: 4, descricao: 'Neurodança (reportagens em formato de experiência imersiva)' },
        { roll: 5, descricao: 'Rádio (ainda existe e é eficaz)' },
        { roll: 6, descricao: 'Boca a boca e folhetos distribuídos nas ruas (baixo orçamento)' },
      ],
      fonteQueProtege: [
        { roll: 1, descricao: 'Um fixer local que odeia a corporação que você está investigando' },
        { roll: 2, descricao: 'Um funcionário público arrependido que vazou documentos' },
        { roll: 3, descricao: 'Um ex-membro de uma gangue que quer expor seus crimes' },
        { roll: 4, descricao: 'Um executivo corporativo rival que quer ver a concorrência queimar' },
        { roll: 5, descricao: 'Um hacker (Netrunner) que invadiu sistemas e te passou a informação' },
        { roll: 6, descricao: 'Um cidadão comum que foi vítima da injustiça que você está denunciando' },
      ],
      quemEstaAtras: [
        { roll: 1, descricao: 'A corporação que você expôs em sua última matéria' },
        { roll: 2, descricao: 'Um político corrupto cujos esquemas você revelou' },
        { roll: 3, descricao: 'Um chefão do crime organizado que não gostou da publicidade' },
        { roll: 4, descricao: 'Um Media rival que quer te silenciar para ficar com os holofotes' },
        { roll: 5, descricao: 'Um ex-aliado que se sentiu traído por uma de suas reportagens' },
        { roll: 6, descricao: 'Um leitor/ telespectador desequilibrado que discorda violentamente de suas opiniões' },
      ],
    },
    exemploPersonagem: {
      papel: 'Media',
      nome: 'Bes Isis',
      handle: 'Bes',
      origemCultural: 'América do Norte (Estados Unidos, Night City)',
      linguas: ['Inglês (4)', 'Linguagem de Rua (2)'],
      estatisticas: {
        INT: 8,
        REF: 6,
        DEX: 5,
        TECH: 5,
        COOL: 7,
        WILL: 7,
        LUCK: 5,
        MOVE: 5,
        BODY: 6,
        EMP: 7,
      },
      rankHabilidadePapel: 4,
      habilidades: {
        Credibilidade: 4,
        Atletismo: 2,
        Briga: 2,
        Concentração: 4,
        Conversação: 6,
        Educação: 4,
        Evasão: 4,
        'Primeiros Socorros': 4,
        'Percepção Humana': 6,
        'Linguagem (Linguagem de Rua)': 2,
        'Linguagem (Inglês)': 4,
        'Especialista Local (Centro Urbano Reconstruído, Night City)': 6,
        Percepção: 6,
        Persuasão: 6,
        Furtividade: 4,
        Subornar: 6,
        Composição: 6,
        Dedução: 6,
        'Armas de uma Mão': 4,
        'Armas Brancas': 4,
        'Pesquisa Bibliotecária': 6,
        'Leitura Labial': 4,
        'Fotografia/Filmagem': 6,
      },
      cyberware: {
        neuralware: {
          linkNeural: true,
          opcoes: ['Chipware Socket'],
        },
        cyberopticos: {
          olhoEsquerdo: { slots: 3, opcoes: ['MicroVideo', 'Imagem Enhance'] },
          olhoDireito: { slots: 3, opcoes: ['MicroVideo'] },
        },
        cyberpernas: {
          pernaEsquerda: { instalada: true, opcoes: [] },
          pernaDireita: { instalada: true, opcoes: [] },
        },
      },
      equipamento: {
        arma: 'Pistola Média',
        municao: 50,
        armadura: 'Kevlar (SP 7 corpo e cabeça)',
        ferramentas: [
          'Agente',
          'Gravador de Áudio',
          'Câmera de Vídeo',
          'Binóculos',
          'Drone de Reconhecimento (pequeno, com câmera)',
        ],
        outrosItens: [
          "Pasta à prova d'água para documentos",
          'Cartões de memória extras (vários)',
          'Lanterna',
          'Trauma Team Silver Card (para emergências)',
        ],
        dinheiroExtra: 200,
      },
      lifepath: {
        tipo: 'Repórter investigativo (focado em escândalos e denúncias), ex-membro da banda Samurai',
        comoChegaAoPublico: 'Screamsheet local (impresso) e Data Pool',
        fonteProtegida: 'Um fixer local que odeia a corporação que você está investigando',
        inimigo: 'A corporação que você expôs em sua última matéria (e que pagou para você perder uma perna)',
      },
    },
  },
  {
    papel: 'Exec',
    descricao:
      'Nos velhos tempos antes do Tempo do Vermelho, você teria sido um duro MBA acelerado a caminho da Corporação. Claro, estava vendendo sua alma para a Companhia, mas encare: as Corporações governavam o mundo. Elas controlavam governos, mercados, nações, exércitos — tudo. E vocês sabiam que quem controlava as Corporações controlava todo o resto. Mas as coisas mudaram quando o maior Megacorps do planeta entrou em uma grande guerra. Agora, sua vida como um executivo júnior é tudo menos fácil. Há aqueles abaixo de você que matariam para terem uma chance em seu trabalho. Literalmente. Há aqueles sobre você que matariam para mantê-lo fora de seus empregos. Literalmente. E eles não estão brincando sobre assassinato — todas as estrelas em ascensão na Corporação tem sua própria equipe de Solos e Netrunners para cobrir projetos de estimação importantes. Você é um Exec.',
    habilidadePapel: {
      nome: 'Trabalho em Equipe',
      descricao:
        'Assim como um executivo corporativo de verdade, o Executivo constrói uma equipe cujos membros o ajudam a alcançar seus objetivos, legais ou não, que a moral permite. Os membros da equipe têm uma descrição visível do trabalho (como secretário ou motorista), mas também têm papéis secretos (como Netrunner, guarda-costas ou assassino). Além disso, eles recebem alojamento gratuito e um bom conjunto de roupas!',
      bonusAssinatura: {
        rank: 1,
        descricao:
          'Como presente, o Exec recebe um termo composto por um derivado de última moda, Parte superior, Parte inferior e Sapatos que os identifica como um membro da elite empresarial. O Exec não pode revendê-los sem levantar suspeitas.',
      },
      moradiaCorporativa: {
        rank: 2,
        descricao:
          'O Executivo tem acesso a um dos seus Apartamentos Corporativos. Desde que permaneçam membros dessa Corporação, podem ficar lá sem pagar qualquer Aluguel ou quaisquer outras taxas. O Executivo ainda deve comprar seu próprio estilo de vida separadamente a cada mês.',
        rank7: 'A habitação corporativa do Executivo é melhorada para um apartamento em Beaverville na Zona Executiva.',
        rank10:
          'A habitação corporativa do Exec é melhorada dramaticamente para uma mansão em Beaverville na Zona Executiva ou uma Cobertura de luxo na Zona Corporativa.',
      },
      seguroSaude: {
        rank: 6,
        descricao: 'O Exec recebe cobertura do Trauma Team Prata, paga mensalmente pela sua Corporação.',
        rank8: 'A Corporação atualiza a cobertura do Trauma Team para Executiva.',
      },
      membrosEquipe: {
        descricao:
          'Começando no Rank 3, o trabalho em equipe dá ao Exec um membro da equipe. Rank 5 e 9 dão um membro de equipe adicional, com um limite máximo de 3 membros de equipe no Rank 9. Os membros da equipe são construídos como Personagens do Jogador, mas não melhoram suas habilidades, são controlados pelo GM, e sua capacidade de seguir uma ordem depende de sua lealdade.',
        perdendoMembros:
          "Se um Membro da Equipe for perdido, o RH irá recuperar seus equipamentos e substituí-los durante a próxima sessão. Esta 'nova contratação' tem novas estatísticas, mas sua lealdade inicial é reduzida para 1. Isso custa ao Exec 200eb em 'taxas de contratação'.",
        lealdade:
          'A lealdade é um valor móvel (máximo 10 entre sessões). Quando uma tarefa é dada, o GM rola 1d6 sob a Lealdade atual. Se falhar, o membro pode recusar, estragar a tarefa ou virar-se contra o Exec. Se a Lealdade cair para 0 ou menos, o membro vai ativamente tentar trair o Exec.',
        tabelaGanhoLealdade: [
          { acao: 'Elogiar o trabalho do membro da equipe (use com moderação)', ganho: 1 },
          { acao: 'Dar-lhes um bônus ou benefício de pelo menos 200eb', ganho: 4 },
          { acao: 'Apoiá-los contra a Administração', ganho: 4 },
          { acao: 'Dar a eles 20% do seu salário por um trabalho', ganho: 6 },
          { acao: 'Dar ao membro da equipa uma folga paga (sessão inteira)', ganho: 6 },
          { acao: 'Correr um risco de dano físico por Membro da Equipe', ganho: 8 },
        ],
        tabelaPerdaLealdade: [
          { acao: 'Não ganhar lealdade com o membro durante uma sessão inteira', perda: -1 },
          { acao: 'Criticar ou esculachar o membro da equipe ou seu trabalho', perda: -2 },
          { acao: 'Ignorar a contribuição do membro da equipe em um trabalho', perda: -4 },
          { acao: 'Deixar de cumprir uma promessa de bônus prometida', perda: -6 },
          { acao: 'Lança-los para a Direção', perda: -6 },
          { acao: 'Abandonar um Membro sob fogo', perda: -8 },
        ],
      },
    },
    geracaoPersonagem: {
      ratoDeRua: {
        descricao: 'Rolar 1d10 e usar a linha correspondente para as estatísticas.',
        tabelaEstatisticas: [
          { roll: 1, INT: 8, REF: 5, DEX: 5, TECH: 3, COOL: 8, WILL: 6, LUCK: 6, MOVE: 5, BODY: 5, EMP: 7 },
          { roll: 2, INT: 8, REF: 6, DEX: 6, TECH: 4, COOL: 7, WILL: 7, LUCK: 7, MOVE: 5, BODY: 7, EMP: 3 },
          { roll: 3, INT: 8, REF: 7, DEX: 6, TECH: 3, COOL: 6, WILL: 7, LUCK: 6, MOVE: 4, BODY: 5, EMP: 4 },
          { roll: 4, INT: 5, REF: 4, DEX: 5, TECH: 6, COOL: 5, WILL: 6, LUCK: 5, MOVE: 5, BODY: 6, EMP: 7 },
          { roll: 5, INT: 7, REF: 6, DEX: 6, TECH: 5, COOL: 5, WILL: 5, LUCK: 7, MOVE: 7, BODY: 5, EMP: 6 },
          { roll: 6, INT: 6, REF: 5, DEX: 5, TECH: 7, COOL: 7, WILL: 7, LUCK: 3, MOVE: 6, BODY: 5, EMP: 7 },
          { roll: 7, INT: 6, REF: 5, DEX: 6, TECH: 5, COOL: 8, WILL: 7, LUCK: 5, MOVE: 5, BODY: 5, EMP: 6 },
          { roll: 8, INT: 8, REF: 5, DEX: 6, TECH: 5, COOL: 7, WILL: 7, LUCK: 4, MOVE: 6, BODY: 5, EMP: 6 },
          { roll: 9, INT: 7, REF: 6, DEX: 5, TECH: 5, COOL: 7, WILL: 6, LUCK: 5, MOVE: 7, BODY: 5, EMP: 7 },
          { roll: 10, INT: 7, REF: 5, DEX: 5, TECH: 3, COOL: 8, WILL: 6, LUCK: 6, MOVE: 6, BODY: 5, EMP: 7 },
        ],
        habilidadesIniciais: [
          { nome: 'Trabalho em Equipe', nivel: 4 },
          { nome: 'Atletismo', nivel: 2 },
          { nome: 'Briga', nivel: 2 },
          { nome: 'Concentração', nivel: 2 },
          { nome: 'Conversação', nivel: 6 },
          { nome: 'Educação', nivel: 6 },
          { nome: 'Evasão', nivel: 6 },
          { nome: 'Primeiros Socorros', nivel: 2 },
          { nome: 'Percepção Humana', nivel: 6 },
          { nome: 'Linguagem (Linguagem de Rua)', nivel: 2 },
          { nome: 'Especialista Local (Sua Casa)', nivel: 2 },
          { nome: 'Percepção', nivel: 2 },
          { nome: 'Persuasão', nivel: 6 },
          { nome: 'Furtividade', nivel: 2 },
          { nome: 'Contabilidade', nivel: 6 },
          { nome: 'Burocracia', nivel: 6 },
          { nome: 'Negócios', nivel: 6 },
          { nome: 'Dedução', nivel: 6 },
          { nome: 'Interrogatório', nivel: 6 },
          { nome: 'Armas de uma Mão', nivel: 6 },
          { nome: 'Cuidados Pessoais', nivel: 4 },
        ],
      },
      edgerunner: {
        descricao:
          'Recebe 86 pontos para distribuir entre as habilidades listadas. Nenhuma habilidade pode ultrapassar nível 6 ou ser inferior a 2.',
        listaHabilidades: [
          'Trabalho em Equipe',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
          'Contabilidade',
          'Burocracia',
          'Negócios',
          'Dedução',
          'Interrogatório',
          'Armas de uma Mão',
          'Cuidados Pessoais',
        ],
        habilidadesObrigatoriasMinimo2: [
          'Trabalho em Equipe',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
        ],
      },
      pacoteCompleto: {
        descricao: 'Constrói o personagem do zero com pontos.',
        regras: {
          pontosEstatisticas: 62,
          minimoEstatistica: 2,
          maximoEstatistica: 8,
          pontosHabilidade: 86,
          dinheiroInicial: 2550,
          dinheiroModaExtra: 800,
        },
        habilidadesObrigatoriasMinimo2: [
          'Trabalho em Equipe',
          'Atletismo',
          'Briga',
          'Concentração',
          'Conversação',
          'Educação',
          'Evasão',
          'Primeiros Socorros',
          'Percepção Humana',
          'Linguagem (Linguagem de Rua)',
          'Especialista Local (Sua Casa)',
          'Percepção',
          'Persuasão',
          'Furtividade',
        ],
      },
    },
    equipamentoInicial: {
      armasEArmadura: [
        { item: 'Pistola Média', quantidade: 1 },
        { item: 'Munição Básica de Pistola Média', quantidade: 50 },
        { item: 'Armadura Corporal Blindagem Leve (ou Kevlar em terno executivo)', sp: 11 },
        { item: 'Armadura de Cabeça Blindagem Leve (ou Kevlar em chapéu/tiara)', sp: 11 },
        { item: 'Agente', quantidade: 1 },
        { item: 'Traje Executivo de Alta Qualidade (incluído no bônus do Rank 1)', quantidade: 1 },
        { item: 'Cyberware: Biomonitor (para monitorar estresse)', quantidade: 1 },
        { item: 'Cyberware: Internal Agent (opcional)', quantidade: 1 },
        { item: 'Dinheiro extra', quantidade: 500 },
      ],
    },
    lifepathEspecifico: {
      tipoCorporacao: [
        { roll: 1, tipo: 'Financeira' },
        { roll: 2, tipo: 'Mídia e Comunicações' },
        { roll: 3, tipo: 'Cybertecnologia e Tecnologias Médicas' },
        { roll: 4, tipo: 'Farmacêutica e Biotecnia' },
        { roll: 5, tipo: 'Culinária, Moda, ou outros consumíveis genéricos' },
        { roll: 6, tipo: 'Produção de energia' },
        { roll: 7, tipo: 'Eletrônica pessoal e robótica' },
        { roll: 8, tipo: 'Serviços corporativos' },
        { roll: 9, tipo: 'Serviços ao consumidor' },
        { roll: 10, tipo: 'Construção e imobiliária' },
      ],
      divisao: [
        { roll: 1, divisao: 'Procurement (Aquisições)' },
        { roll: 2, divisao: 'Manufacturing (Manufatura)' },
        { roll: 3, divisao: 'Research and Development (Pesquisa e Desenvolvimento)' },
        { roll: 4, divisao: 'Human Resources (Recursos Humanos)' },
        { roll: 5, divisao: 'Public Affairs/Publicity/Advertising (Relações Públicas/Publicidade)' },
        { roll: 6, divisao: 'Mergers and Acquisitions (Fusões e Aquisições)' },
      ],
      eticaCorporativa: [
        { roll: 1, descricao: 'Sempre trabalhando para o bem, apoiando plenamente as práticas éticas.' },
        { roll: 2, descricao: 'Funciona como um negócio justo e honesto o tempo todo.' },
        { roll: 3, descricao: 'Ocasionalmente vacila e faz coisas antiéticas, mas é raro.' },
        { roll: 4, descricao: 'Disposto a quebrar as regras para conseguir o que precisa.' },
        { roll: 5, descricao: 'Implacável e concentrada no lucro, disposto a fazer algumas coisas ruins.' },
        { roll: 6, descricao: 'Totalmente maligno. Se envolve em negócios ilegais e antiéticos o tempo todo.' },
      ],
      baseCorporacao: [
        { roll: 1, base: 'Numa cidade' },
        { roll: 2, base: 'Várias cidades' },
        { roll: 3, base: 'Por todo o Estado' },
        { roll: 4, base: 'Nacional' },
        { roll: 5, base: 'Internacional, com escritórios em algumas grandes cidades' },
        { roll: 6, base: 'Internacional, com escritórios em todos os lugares' },
      ],
      quemEstaAtras: [
        { roll: 1, descricao: 'Corporação Rival na mesma indústria' },
        { roll: 2, descricao: 'A polícia está de olho em você' },
        { roll: 3, descricao: 'Um Mídia local quer acabar com você' },
        { roll: 4, descricao: 'Diferentes divisões na sua própria companhia estão brigando entre si' },
        { roll: 5, descricao: 'O governo local não gosta da sua Corporação' },
        { roll: 6, descricao: 'Corporações internacionais estão de olho em você para uma aquisição hostil' },
      ],
      estadoChefe: [
        { roll: 1, descricao: 'Seu chefe orienta você a tomar cuidado com seus inimigos' },
        { roll: 2, descricao: 'Seu chefe lhe dá passe livre e não quer saber o que você está fazendo' },
        { roll: 3, descricao: 'Seu chefe é obcecado por detalhes e tenta interferir em seu trabalho' },
        { roll: 4, descricao: 'Seu chefe é um psicopata cujas explosões imprevisíveis são compensadas pela paranoia silenciosa' },
        { roll: 5, descricao: 'Seu chefe é legal e cuida de suas costas contra os rivais' },
        { roll: 6, descricao: 'O teu chefe se sente ameaçado pela tua ascensão meteórica e planeja te apunhalar' },
      ],
    },
    membrosEquipeExemplo: {
      bodyguard: {
        tipo: 'Bodyguard (Guarda-costas)',
        trabalhoFachada: 'Manobrista, Motorista Pessoal',
        trabalhoVerdadeiro: 'Proteger o Exec, dirigir e pilotar veículos da equipe',
        tabelaCriacao: [
          { roll: 1, INT: 5, REF: 8, DEX: 6, TECH: 4, COOL: 6, WILL: 5, MOVE: 5, BODY: 6, EMP: 5 },
          { roll: 2, INT: 5, REF: 7, DEX: 7, TECH: 5, COOL: 5, WILL: 7, MOVE: 7, BODY: 4, EMP: 3 },
          { roll: 3, INT: 6, REF: 8, DEX: 8, TECH: 4, COOL: 7, WILL: 4, MOVE: 5, BODY: 6, EMP: 2 },
          { roll: 4, INT: 4, REF: 8, DEX: 7, TECH: 4, COOL: 5, WILL: 6, MOVE: 4, BODY: 5, EMP: 4 },
          { roll: 5, INT: 7, REF: 6, DEX: 4, TECH: 5, COOL: 7, WILL: 6, MOVE: 5, BODY: 6, EMP: 4 },
          { roll: 6, INT: 6, REF: 8, DEX: 6, TECH: 3, COOL: 5, WILL: 5, MOVE: 3, BODY: 5, EMP: 3 },
        ],
        habilidadesBase: {
          '+2': ['Atletismo', 'Concentração', 'Conversação', 'Educação', 'Primeiros Socorros', 'Percepção Humana', 'Linguagem (Linguagem de Rua)', 'Especialista Local (Sua Casa)', 'Percepção', 'Persuasão'],
          '+4': ['Briga', 'Resistência', 'Evasão', 'Tecnologia de Veículos Terrestres', 'Pilotar Veículo Aéreo', 'Pilotar Veículo Marítimo', 'Tecnologia de Veículos Marítimos', 'Furtividade', 'Rastrear'],
          '+6': ['Conduzir veículo terrestre', 'Armas de uma Mão'],
        },
        cyberware: ['Radar/Sonar Implantado', 'Conjunto Cyberaudio', 'Agente Interno', 'Rastreador', 'Detector de Radar'],
        equipamento: ['Blindagem leve (SP11)', 'Groundcar compacto com atualização de assento', 'Pistola Muito Pesada', 'Munição de pistola básica muito Pesada x50'],
      },
      netrunner: {
        tipo: 'Netrunner Corporativo',
        trabalhoFachada: 'Engenheiro T.I., Pesquisador',
        trabalhoVerdadeiro: 'Netrunning e colher informações',
        tabelaCriacao: [
          { roll: 1, INT: 6, REF: 7, DEX: 8, TECH: 7, COOL: 5, WILL: 4, MOVE: 5, BODY: 5, EMP: 3 },
          { roll: 2, INT: 7, REF: 8, DEX: 6, TECH: 8, COOL: 4, WILL: 3, MOVE: 4, BODY: 3, EMP: 5 },
          { roll: 3, INT: 6, REF: 8, DEX: 6, TECH: 8, COOL: 6, WILL: 4, MOVE: 4, BODY: 4, EMP: 3 },
          { roll: 4, INT: 5, REF: 6, DEX: 4, TECH: 7, COOL: 4, WILL: 5, MOVE: 6, BODY: 5, EMP: 4 },
          { roll: 5, INT: 6, REF: 7, DEX: 5, TECH: 8, COOL: 5, WILL: 5, MOVE: 3, BODY: 3, EMP: 6 },
          { roll: 6, INT: 8, REF: 7, DEX: 6, TECH: 7, COOL: 4, WILL: 4, MOVE: 4, BODY: 4, EMP: 4 },
        ],
        habilidadesBase: {
          '+2': ['Interface (Habilidade de Papel do Netrunner)', 'Atletismo', 'Briga', 'Concentração', 'Conversação', 'Evasão', 'Primeiros Socorros', 'Percepção Humana', 'Linguagem (Linguagem de Rua)', 'Especialista Local (Sua Casa)', 'Percepção', 'Persuasão'],
          '+4': ['Tecnologia Básica', 'Criptografia', 'Cybertecnologia', 'Educação', 'Tecnologia Eletrônica/Segurança (x2)', 'Falsificação', 'Pesquisa Bibliotecária', 'Armas de uma Mão', 'Furtividade'],
        },
        cyberware: ['Link Neural', 'Chipware Socket', 'Editor de Dor', 'Interface Plugs', 'Cyberopticos com Virtualidade'],
        equipamento: ['Agente', 'Blindagem Leve (SP11)', 'Cyberdeck (7 slots: Sword, Sword, Killer, Worm, Worm, Armor)', 'Pistola Muito Pesada', 'Munição Básica para Pistola Muito Pesada x50'],
      },
      tech: {
        tipo: 'Tech Corporativo',
        trabalhoFachada: 'Engenheiro TI, Estagiário',
        trabalhoVerdadeiro: 'Reparar equipamentos e armas da equipe',
        tabelaCriacao: [
          { roll: 1, INT: 8, REF: 8, DEX: 5, TECH: 7, COOL: 3, WILL: 4, MOVE: 4, BODY: 5, EMP: 6 },
          { roll: 2, INT: 8, REF: 7, DEX: 6, TECH: 8, COOL: 3, WILL: 5, MOVE: 5, BODY: 4, EMP: 4 },
          { roll: 3, INT: 8, REF: 6, DEX: 5, TECH: 8, COOL: 4, WILL: 3, MOVE: 3, BODY: 7, EMP: 6 },
          { roll: 4, INT: 8, REF: 8, DEX: 5, TECH: 7, COOL: 4, WILL: 4, MOVE: 4, BODY: 5, EMP: 5 },
          { roll: 5, INT: 7, REF: 7, DEX: 3, TECH: 7, COOL: 5, WILL: 3, MOVE: 6, BODY: 6, EMP: 3 },
          { roll: 6, INT: 7, REF: 8, DEX: 5, TECH: 8, COOL: 6, WILL: 3, MOVE: 3, BODY: 5, EMP: 5 },
        ],
        habilidadesBase: {
          '+2': ['Atletismo', 'Briga', 'Concentração', 'Conversação', 'Evasão', 'Primeiros Socorros', 'Percepção Humana', 'Linguagem (Linguagem de Rua)', 'Especialista Local (Sua Casa)', 'Percepção', 'Persuasão', 'Furtividade'],
          '+4': ['Educação', 'Armas de uma Mão', 'Tecnologia de Armas (x2)'],
          '+6': ['Tecnologia Básica', 'Cybertecnologia', 'Tecnologia Eletrônica/Segurança (x2)'],
        },
        cyberware: ['Ferramentas embutidas', 'Conjunto Cyberaudio', 'Agente interno', 'Detector de erros', 'Gravador de áudio'],
        equipamento: ['Blindagem leve (SP11)', 'Pistola Muito Pesada', 'Munição básica de Pistola Muito Pesada x50'],
      },
    },
    exemploPersonagem: {
      papel: 'Exec',
      nome: 'Chanda Mishra',
      handle: "Chanda (ou 'A Fênix')",
      origemCultural: 'Sul da Ásia (Índia)',
      linguas: ['Hindi (4)', 'Inglês (4)', 'Linguagem de Rua (2)'],
      estatisticas: {
        INT: 8,
        REF: 6,
        DEX: 5,
        TECH: 4,
        COOL: 8,
        WILL: 7,
        LUCK: 5,
        MOVE: 5,
        BODY: 5,
        EMP: 6,
      },
      rankHabilidadePapel: 4,
      membrosEquipe: [
        { tipo: 'Bodyguard (Rank 3)', nome: 'Dmitri Volkov', lealdade: 5 },
        { tipo: 'Netrunner (Rank 5)', nome: 'Yuki Tanaka', lealdade: 4 },
      ],
      habilidades: {
        'Trabalho em Equipe': 4,
        Atletismo: 2,
        Briga: 2,
        Concentração: 4,
        Conversação: 6,
        Educação: 6,
        Evasão: 4,
        'Primeiros Socorros': 2,
        'Percepção Humana': 6,
        'Linguagem (Linguagem de Rua)': 2,
        'Linguagem (Hindi)': 4,
        'Linguagem (Inglês)': 4,
        'Especialista Local (Corporate Center, Night City)': 4,
        Percepção: 4,
        Persuasão: 6,
        Furtividade: 4,
        Contabilidade: 6,
        Burocracia: 6,
        Negócios: 6,
        Dedução: 6,
        Interrogatório: 6,
        'Armas de uma Mão': 4,
        'Cuidados Pessoais': 4,
      },
      cyberware: {
        neuralware: {
          linkNeural: true,
          opcoes: ['Chipware Socket'],
        },
        cyberaudio: {
          suite: true,
          opcoes: ['Internal Agent', 'Voice Stress Analyzer'],
        },
        cyberopticos: {
          olhoEsquerdo: { slots: 3, opcoes: ['MicroVideo', 'Chyron'] },
        },
        fashionware: ['Biomonitor', 'Shift Tacts'],
      },
      equipamento: {
        arma: 'Pistola Média (elegante, cromada)',
        municao: 30,
        armadura: 'Traje Corporativo (Kevlar, SP 7 corpo e cabeça, com aparência de terno executivo)',
        roupas: 'Traje Executivo de Alta Qualidade (incluído no bônus do Rank 1)',
        outrosItens: [
          'Agente de última geração',
          'Tablet corporativo com dados sigilosos',
          'Cartão de crédito corporativo (com limites)',
          'Trauma Team Silver Card (pago pela empresa)',
          'Pager criptografado para comunicação com a equipe',
        ],
        dinheiroExtra: 300,
      },
      lifepath: {
        tipoCorporacao: 'Financeira (Merrill, Asukaga & Finch)',
        divisao: 'Mergers and Acquisitions (Fusões e Aquisições)',
        etica: 'Implacável e concentrada no lucro, disposto a fazer algumas coisas ruins.',
        base: 'Internacional, com escritórios em algumas grandes cidades (incluindo Night City)',
        quemEstaAtras: 'Diferentes divisões na sua própria companhia estão brigando entre si (e ela está no meio)',
        estadoChefe: 'Seu chefe se sente ameaçado pela tua ascensão meteórica e planeja te apunhalar',
      },
    },
  },
];

const SKILL_CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'awareness', label: 'Consciencia' },
  { id: 'body', label: 'Corpo' },
  { id: 'control', label: 'Controle' },
  { id: 'education', label: 'Educacao' },
  { id: 'fighting', label: 'Combate' },
  { id: 'performance', label: 'Performance' },
  { id: 'ranged', label: 'Distancia' },
  { id: 'social', label: 'Social' },
  { id: 'tech', label: 'Tecnica' },
  { id: 'role', label: 'Role' },
];

const REQUIRED_SKILLS = [
  'Atletismo',
  'Briga',
  'Concentracao',
  'Conversacao',
  'Educacao',
  'Evasao',
  'Primeiros Socorros',
  'Percepcao Humana',
  'Linguagem (Linguagem de Rua)',
  'Especialista Local (Sua Casa)',
  'Percepcao',
  'Persuasao',
  'Furtividade',
];

const SKILL_LIBRARY = [
  { name: 'Concentracao', stat: 'WILL', cost: 1, category: 'awareness', required: true },
  { name: 'Esconder/Revelar Objetos', stat: 'INT', cost: 1, category: 'awareness' },
  { name: 'Leitura Labial', stat: 'INT', cost: 1, category: 'awareness' },
  { name: 'Percepcao', stat: 'INT', cost: 1, category: 'awareness', required: true },
  { name: 'Rastrear', stat: 'INT', cost: 1, category: 'awareness' },

  { name: 'Atletismo', stat: 'DEX', cost: 1, category: 'body', required: true },
  { name: 'Contorcionismo', stat: 'DEX', cost: 1, category: 'body' },
  { name: 'Danca', stat: 'DEX', cost: 1, category: 'body' },
  { name: 'Resistencia', stat: 'WILL', cost: 1, category: 'body' },
  { name: 'Resistir Tortura/Drogas', stat: 'WILL', cost: 1, category: 'body' },
  { name: 'Furtividade', stat: 'DEX', cost: 1, category: 'body', required: true },

  { name: 'Conduzir Veiculo Terrestre', stat: 'REF', cost: 1, category: 'control' },
  { name: 'Pilotar Veiculos Aereos', stat: 'REF', cost: 2, category: 'control' },
  { name: 'Pilotar Veiculos Maritimos', stat: 'REF', cost: 1, category: 'control' },
  { name: 'Equitacao', stat: 'REF', cost: 1, category: 'control' },

  { name: 'Contabilidade', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Afinidade com Animais', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Burocracia', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Negocios', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Composicao', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Criminologia', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Criptografia', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Deducao', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Educacao', stat: 'INT', cost: 1, category: 'education', required: true },
  { name: 'Jogos', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Linguagem (Linguagem de Rua)', stat: 'INT', cost: 1, category: 'education', required: true },
  { name: 'Linguagem', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Pesquisa Bibliotecaria', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Especialista Local (Sua Casa)', stat: 'INT', cost: 1, category: 'education', required: true },
  { name: 'Especialista Local', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Ciencias', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Taticas', stat: 'INT', cost: 1, category: 'education' },
  { name: 'Sobrevivencia', stat: 'INT', cost: 1, category: 'education' },

  { name: 'Briga', stat: 'DEX', cost: 1, category: 'fighting', required: true },
  { name: 'Evasao', stat: 'DEX', cost: 1, category: 'fighting', required: true },
  { name: 'Artes Marciais', stat: 'DEX', cost: 2, category: 'fighting' },
  { name: 'Armas Brancas', stat: 'DEX', cost: 1, category: 'fighting' },

  { name: 'Atuacao', stat: 'COOL', cost: 1, category: 'performance' },
  { name: 'Tocar Instrumentos', stat: 'TECH', cost: 1, category: 'performance' },

  { name: 'Arquearia', stat: 'REF', cost: 1, category: 'ranged' },
  { name: 'Disparo Automatico', stat: 'REF', cost: 2, category: 'ranged' },
  { name: 'Armas de uma Mao', stat: 'REF', cost: 1, category: 'ranged' },
  { name: 'Armas Pesadas', stat: 'REF', cost: 2, category: 'ranged' },
  { name: 'Armas de Ombro', stat: 'REF', cost: 1, category: 'ranged' },

  { name: 'Suborno', stat: 'COOL', cost: 1, category: 'social' },
  { name: 'Conversacao', stat: 'EMP', cost: 1, category: 'social', required: true },
  { name: 'Percepcao Humana', stat: 'EMP', cost: 1, category: 'social', required: true },
  { name: 'Interrogatorio', stat: 'COOL', cost: 1, category: 'social' },
  { name: 'Persuasao', stat: 'COOL', cost: 1, category: 'social', required: true },
  { name: 'Cuidado Pessoal', stat: 'COOL', cost: 1, category: 'social' },
  { name: 'Malandragem', stat: 'COOL', cost: 1, category: 'social' },
  { name: 'Negociacao', stat: 'COOL', cost: 1, category: 'social' },
  { name: 'Guarda-roupa & Estilo', stat: 'COOL', cost: 1, category: 'social' },

  { name: 'Tecnologia Veiculos Aereos', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Tecnologia Basica', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Cybertecnologia', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Demolicoes', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Tecnologia Eletronica/Seguranca', stat: 'TECH', cost: 2, category: 'tech' },
  { name: 'Primeiros Socorros', stat: 'TECH', cost: 1, category: 'tech', required: true },
  { name: 'Falsificacao', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Tecnologia Veiculos Terrestres', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Pintura/Desenho/Escultura', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Paramedico', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Fotografia/Filme', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Tecnologia Veiculos Maritimos', stat: 'TECH', cost: 1, category: 'tech' },
  { name: 'Tecnologia de Armas', stat: 'TECH', cost: 1, category: 'tech' },

  { name: 'Interface', stat: 'INT', cost: 1, category: 'role' },
];

const LIFEPATH_ORIGENS = [
  { roll: 1, regiao: 'America do Norte', linguas: ['Chines', 'Cree', 'Crioulo', 'Ingles', 'Frances', 'Navajo', 'Espanhol'] },
  { roll: 2, regiao: 'America Central/Sul', linguas: ['Crioulo', 'Ingles', 'Alemao', 'Guarani', 'Maia', 'Portugues', 'Quichua', 'Espanhol'] },
  { roll: 3, regiao: 'Europa Ocidental', linguas: ['Holandes', 'Ingles', 'Frances', 'Alemao', 'Italiano', 'Noruegues', 'Portugues', 'Espanhol'] },
  { roll: 4, regiao: 'Europa Oriental', linguas: ['Ingles', 'Finlandes', 'Polones', 'Romeno', 'Russo', 'Ucraniano'] },
  { roll: 5, regiao: 'Oriente Medio/Norte da Africa', linguas: ['Arabe', 'Berbere', 'Ingles', 'Farsi', 'Frances', 'Hebraico', 'Turco'] },
  { roll: 6, regiao: 'Africa Subsaariana', linguas: ['Arabe', 'Ingles', 'Frances', 'Hausa', 'Lingala', 'Oromo', 'Portugues', 'Suaili', 'Twi', 'Ioruba'] },
  { roll: 7, regiao: 'Sul da Asia', linguas: ['Bengali', 'Dari', 'Ingles', 'Hindi', 'Nepali', 'Sinhala', 'Tamil', 'Urdu'] },
  { roll: 8, regiao: 'Sudeste Asiatico', linguas: ['Arabe', 'Birmanes', 'Ingles', 'Filipino', 'Hindi', 'Indonesio', 'Khmer', 'Malaio', 'Vietnamita'] },
  { roll: 9, regiao: 'Leste Asiatico', linguas: ['Cantones', 'Ingles', 'Japones', 'Coreano', 'Mandarim', 'Mongol'] },
  { roll: 10, regiao: 'Oceania/Ilhas do Pacifico', linguas: ['Ingles', 'Frances', 'Havaiano', 'Maori', 'Pana-Nyungan', 'Taitiano'] },
];

const LIFEPATH_PERSONALIDADE = [
  'Timido e Reservado',
  'Rebelde, Antissocial e Violento',
  'Arrogante, Orgulhoso e Indiferente',
  'Mal-humorado, Imprudente e Teimoso',
  'Implicante, Exigente e Nervoso',
  'Estavel e Serio',
  'Bobo e Distraido',
  'Sorrateiro e Enganador',
  'Intelectual e Fechado',
  'Amigavel e Extrovertido',
];

const LIFEPATH_ROUPA = [
  'Elegante Generico',
  'Roupas de Lazer',
  'Urbano Vistoso',
  'Executivo',
  'Alta Moda',
  'Boemio',
  'Bolsa Feminina Chic',
  'Roupas de Gangue',
  'Couro Nomade',
  'Asia Pop',
];

const LIFEPATH_PENTEADO = [
  'Moicano',
  'Longo e Baguncado',
  'Curto e Espetado',
  'Selvagem e Espalhado',
  'Careca',
  'Trancado',
  'Cores Selvagens',
  'Curto e Arrumado',
  'Curto e Cacheado',
  'Longo e Liso',
];

const LIFEPATH_ADORNO = [
  'Tatuagens',
  'Espelho de Bolso',
  'Cicatrizes Rituais',
  'Luvas com Espetos',
  'Argolas de Nariz',
  'Piercings (lingua ou outros)',
  'Implantes de Unhas Estranhos',
  'Botas com Espetos ou Rodas',
  'Luvas sem Dedos',
  'Bijuteria Estranha',
];

const LIFEPATH_VALOR = [
  'Dinheiro',
  'Honra',
  'Seu mundo',
  'Honestidade',
  'Sabedoria',
  'Vinganca',
  'Amor',
  'Poder',
  'Familia',
  'Amizade',
];

const LIFEPATH_SENTIMENTO = [
  'Neutro',
  'Neutro',
  'Gosto de quase todos',
  'Odeio quase todos',
  'Pessoas sao ferramentas',
  'Cada pessoa e valiosa',
  'Pessoas sao obstaculos',
  'Pessoas nao sao confiaveis',
  'Deixe o mundo queimar',
  'Pessoas sao maravilhosas',
];

const LIFEPATH_PESSOA_IMPORTANTE = [
  'Um dos pais',
  'Um irmao ou irma',
  'Um amor',
  'Um amigo',
  'Voce mesmo',
  'Um pet',
  'Um professor ou mentor',
  'Uma figura publica',
  'Um heroi pessoal',
  'Ninguem',
];

const LIFEPATH_POSSE = [
  'Uma arma',
  'Uma ferramenta',
  'Uma peca de roupa',
  'Uma fotografia',
  'Um livro ou diario',
  'Uma recordacao',
  'Um instrumento musical',
  'Uma joia',
  'Um brinquedo',
  'Uma carta',
];

const LIFEPATH_BACKGROUND = [
  'Execs Corporativos - Rico, poderoso, seguranca privada',
  'Gerente Corporativo - Classe media alta, casas seguras',
  'Tecnico Corporativo - Classe media, suburbios',
  'Bando Nomade - Movel, aprendia a dirigir cedo',
  '"Parente" de membro de gangue - Violento, instavel',
  'Morador da Zona - Predio decadente, fortificado',
  'Sem-teto - Ruas, lixeiras, fome constante',
  'Megastrutura - Conapt pequeno, racao',
  'Cidade fantasma - Pioneiro, perigoso mas com comida',
  'Nomade - Mudava sempre, vida variada',
];

const LIFEPATH_AMBIENTE = [
  'Casa na Zona Executiva - Seguro, limpo, chato',
  'Apartamento na Cidade - Movimentado, perigoso as vezes',
  'Caravana Nomade - Aventureiro, familia unida',
  'Comunidade Agricola - Trabalhador, pacifico',
  'Territorio de Gangue - Violencia constante',
  'Complexo Corporativo - Controlado, vigilancia',
  'Ruinhas da Guerra - Destruicao, escassez',
  'Navio ou Plataforma - Isolado, comunidade fechada',
  'Zona de Combate - Perigo diario',
  'Conapt Superlotado - Apertado, mas seguro',
];

const LIFEPATH_CRISE = [
  'Sua familia perdeu tudo no Colapso',
  'Seus pais foram mortos em uma guerra de gangues',
  'Sua familia foi separada durante a 4a Guerra Corporativa',
  'Voce foi abandonado pelos pais',
  'Um membro da familia desenvolveu ciberpsicose',
  'Sua familia foi expulsa de casa pelo governo',
  'Seus pais eram viciados e voce teve que se virar sozinho',
  'Sua familia se envolveu com crime organizado',
  'Voce foi criado em um orfanato corporativo',
  'Sua familia conseguiu sobreviver intacta',
];

const LIFEPATH_RELACAO_AMIGOS = [
  'Como um irmao mais velho',
  'Como um irmao mais novo',
  'Um professor ou mentor',
  'Um parceiro ou colega de trabalho',
  'Um antigo amante',
  'Um velho inimigo',
  'Como um parente',
  'Um velho amigo de infancia',
  'Alguem que conheceu na rua',
  'Alguem com interesses em comum',
];

const LIFEPATH_INIMIGO_QUEM = [
  'Ex-amigo',
  'Ex-amor',
  'Parente afastado',
  'Inimigo de infancia',
  'Subordinado',
  'Superior',
  'Colega de trabalho',
  'Exec corporativo',
  'Oficial do governo',
  'Membro de gangue',
];

const LIFEPATH_INIMIGO_CAUSA = [
  'Fez o outro perder status',
  'Causou perda de um ente querido',
  'Humilhacao publica',
  'Acusou de covardia',
  'Desertou ou traiu',
  'Recusou oferta de emprego/romance',
  'Simplesmente nao gostam um do outro',
  'Rivalidade amorosa',
  'Rivalidade de negocios',
  'Incriminou o outro',
];

const LIFEPATH_INIMIGO_PODER = [
  'Apenas eles mesmos',
  'Eles + 1 amigo',
  'Eles + 1d6/2 amigos',
  'Eles + 1d10/2 amigos',
  'Uma gangue (1d10+5)',
  'Policia local',
  'Um chefe de gangue poderoso',
  'Uma pequena corporacao',
  'Uma corporacao poderosa',
  'Uma cidade inteira',
];

const LIFEPATH_VINGANCA = [
  'Evitar a escoria',
  'Evitar a escoria',
  'Furia assassina',
  'Furia assassina',
  'Enganacao indireta',
  'Enganacao indireta',
  'Ataque verbal',
  'Ataque verbal',
  'Incriminacao',
  'Matar ou mutilar',
];

const LIFEPATH_AMOR = [
  'Morreu em acidente',
  'Desapareceu misteriosamente',
  'Simplesmente nao deu certo',
  'Um objetivo ou vinganca ficou entre voces',
  'Foi raptado',
  'Enlouqueceu ou ficou ciberpsicopata',
  'Cometeu suicidio',
  'Foi morto em luta',
  'Um rival tirou voce do jogo',
  'Esta preso ou exilado',
];

const LIFEPATH_META = [
  'Ficar rico',
  'Ficar famoso',
  'Mudar o mundo',
  'Se vingar',
  'Proteger os inocentes',
  'Encontrar um amor verdadeiro',
  'Simplesmente sobreviver',
  'Criar algo duradouro',
  'Descobrir a verdade',
  'Atingir a paz interior',
];

const LIFEPATH_INJUSTICADO = ['Voce', 'Eles', 'Outra pessoa'];

function cloneValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function mergeDeep(base, override) {
  if (!override || typeof override !== 'object') return cloneValue(base);
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : cloneValue(base);
  }

  const result = { ...base };
  Object.keys(override).forEach((key) => {
    const next = override[key];
    if (Array.isArray(next)) {
      result[key] = next;
      return;
    }
    if (next && typeof next === 'object' && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      result[key] = mergeDeep(base[key], next);
      return;
    }
    result[key] = next;
  });
  return result;
}

function shortenText(text, limit = 140) {
  if (!text) return '';
  const clean = String(text).trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, Math.max(0, limit - 3))}...`;
}

function rollDie(sides = 10) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollFromList(list) {
  if (!list.length) return { roll: 0, value: '' };
  const roll = rollDie(list.length);
  return { roll, value: list[roll - 1] };
}

function findLabel(list, id) {
  return list.find((item) => item.id === id)?.label ?? id;
}

function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parsePackSize(text) {
  if (!text) return 1;
  const match = String(text).match(/(\d+)/);
  if (!match) return 1;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function guessCategoryFromName(name) {
  const clean = normalizeText(name);
  if (!clean) return 'gear';
  if (clean.includes('municao') || clean.includes('ammo')) return 'ammo';
  if (clean.includes('armadura') || clean.includes('blindagem') || clean.includes('kevlar') || clean.includes('flak')) return 'armor';
  if (
    clean.includes('pistola') ||
    clean.includes('rifle') ||
    clean.includes('espingarda') ||
    clean.includes('smg') ||
    clean.includes('sniper') ||
    clean.includes('lancador') ||
    clean.includes('granada')
  ) {
    return 'ranged';
  }
  if (
    clean.includes('arma branca') ||
    clean.includes('faca') ||
    clean.includes('fac') ||
    clean.includes('espada') ||
    clean.includes('motosserra') ||
    clean.includes('taco')
  ) {
    return 'melee';
  }
  if (clean.includes('moda') || clean.includes('roupa') || clean.includes('estilo')) return 'fashion';
  if (clean.includes('cyber')) return 'cyberware';
  return 'gear';
}

function toNumber(value) {
  if (value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
}

export default function CharacterProfilePanel({ campaignId, playerId, onBack }) {
  const [sheet, setSheet] = useState(() => cloneValue(EMPTY_SHEET));
  const [hydrated, setHydrated] = useState(false);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillNivel, setNewSkillNivel] = useState('');
  const [newSkillStat, setNewSkillStat] = useState('');
  const [newSkillBase, setNewSkillBase] = useState('');

  const [newWeapon, setNewWeapon] = useState({
    nome: '',
    tipo: '',
    dano: '',
    municao: '',
    municaoMax: '',
    cdt: '',
    habilidade: '',
    qualidade: '',
  });

  const [lifepathTab, setLifepathTab] = useState('origens');
  const [statsRoll, setStatsRoll] = useState(null);

  const [newCyberOption, setNewCyberOption] = useState({ nome: '', slot: '' });
  const [newLeftOptic, setNewLeftOptic] = useState('');
  const [newRightOptic, setNewRightOptic] = useState('');


  const [newReputationEvent, setNewReputationEvent] = useState({ descricao: '', nivel: '' });

  const [newAmmo, setNewAmmo] = useState({ tipo: '', quantidade: '' });
  const [newGrenade, setNewGrenade] = useState({ tipo: '', quantidade: '' });
  const [newItem, setNewItem] = useState({ nome: '', quantidade: '' });

  const [catalogItems, setCatalogItems] = useState(SHOP_ITEMS);
  const [shopCategory, setShopCategory] = useState('all');
  const [shopSearch, setShopSearch] = useState('');
  const [gearCart, setGearCart] = useState([]);
  const [gearStatus, setGearStatus] = useState('');
  const [inventorySnapshot, setInventorySnapshot] = useState(null);
  const [skillCategory, setSkillCategory] = useState('all');
  const [skillStatus, setSkillStatus] = useState('');

  const sections = useMemo(
    () => [
      { id: 'identificacao', label: 'Identificacao', open: true },
      { id: 'papeis', label: 'Papeis', open: false },
      { id: 'estatisticas', label: 'Estatisticas', open: true },
      { id: 'derivadas', label: 'Derivadas', open: false },
      { id: 'habilidades', label: 'Habilidades', open: false },
      { id: 'combate', label: 'Combate', open: false },
      { id: 'estiloVida', label: 'Estilo de Vida', open: false },
      { id: 'moradia', label: 'Moradia', open: false },
      { id: 'lifepath', label: 'Lifepath', open: false },
      { id: 'progressao', label: 'Progressao', open: false },
      { id: 'reputacao', label: 'Reputacao', open: false },
      { id: 'equipamento', label: 'Equipamento', open: false },
    ],
    []
  );

  const wizardSteps = useMemo(
    () => [
      { id: 'metodo', label: 'Metodo', hint: 'Como voce vai criar', sections: [] },
      { id: 'papel', label: 'Papel', hint: 'Base do personagem', sections: ['identificacao', 'papeis'] },
      { id: 'lifepath', label: 'Lifepath', hint: 'Historia e conexoes', sections: ['lifepath'] },
      { id: 'stats', label: 'Atributos', hint: 'STATS e derivados', sections: ['estatisticas', 'derivadas'] },
      { id: 'skills', label: 'Habilidades', hint: 'Distribua pontos', sections: ['habilidades'] },
      {
        id: 'equip',
        label: 'Equipamento',
        hint: 'Combate e itens',
        sections: ['combate', 'equipamento'],
      },
      {
        id: 'vida',
        label: 'Vida',
        hint: 'Moradia, progresso e reputacao',
        sections: ['estiloVida', 'moradia', 'progressao', 'reputacao'],
      },
      { id: 'resumo', label: 'Resumo', hint: 'Ficha final', sections: [] },
    ],
    []
  );

  const [activeStep, setActiveStep] = useState(0);
  const baseItemIds = useMemo(() => new Set(SHOP_ITEMS.map((item) => item.id)), []);
  const sectionMap = useMemo(
    () =>
      sections.reduce((acc, section) => {
        acc[section.id] = section;
        return acc;
      }, {}),
    [sections]
  );
  const currentStep = wizardSteps[activeStep] || wizardSteps[0];
  const visibleSections = useMemo(
    () => (currentStep.sections || []).map((id) => ({ ...sectionMap[id], open: true })),
    [currentStep.sections, sectionMap]
  );

  const selectedRole = useMemo(
    () => ROLE_LIBRARY.find((role) => role.papel === sheet.identificacao.papel) || null,
    [sheet.identificacao.papel]
  );
  const roleKey = normalizeText(sheet.identificacao.papel);
  const isExecRole = roleKey === normalizeText('Exec');
  const isNomadRole = roleKey === normalizeText('Nomad');
  const lifestyleOption = useMemo(
    () => resolveOption(LIFESTYLE_OPTIONS, sheet.estiloVida.tipo),
    [sheet.estiloVida.tipo]
  );
  const housingOption = useMemo(
    () => resolveOption(HOUSING_OPTIONS, sheet.moradia.tipo),
    [sheet.moradia.tipo]
  );
  const lifestyleCost = resolveMonthlyCost(sheet.estiloVida.custoMensal, lifestyleOption?.cost);
  const housingCost = resolveMonthlyCost(sheet.moradia.aluguelMensal, housingOption?.cost);
  const totalMonthlyCost = lifestyleCost + housingCost;
  const lifestyleSelectValue = lifestyleOption?.id || '';
  const housingSelectValue = housingOption?.id || '';
  const skillDefinitions = useMemo(() => {
    const map = new Map();
    SKILL_LIBRARY.forEach((skill) => {
      map.set(normalizeText(skill.name), skill);
    });
    return map;
  }, []);
  const requiredSkillSet = useMemo(
    () => new Set(REQUIRED_SKILLS.map((skill) => normalizeText(skill))),
    []
  );

  const resolveSkillAlias = (normalized) => {
    if (!normalized) return normalized;
    if (normalized.startsWith(normalizeText('linguagem'))) return normalizeText('Linguagem');
    if (normalized.startsWith(normalizeText('especialistalocal'))) return normalizeText('Especialista Local');
    if (normalized.startsWith(normalizeText('tocarinstrumentos'))) return normalizeText('Tocar Instrumentos');
    if (normalized.startsWith(normalizeText('artesmarciais'))) return normalizeText('Artes Marciais');
    if (normalized.startsWith(normalizeText('disparoautomatico'))) return normalizeText('Disparo Automatico');
    if (normalized.startsWith(normalizeText('armaspesadas'))) return normalizeText('Armas Pesadas');
    if (normalized.startsWith(normalizeText('pilotarveiculosaereos'))) return normalizeText('Pilotar Veiculos Aereos');
    if (normalized.startsWith(normalizeText('tecnologiaeletronicaseguranca')))
      return normalizeText('Tecnologia Eletronica/Seguranca');
    return normalized;
  };

  const resolveSkillDefinition = (name) => {
    const normalized = normalizeText(name);
    const aliasKey = resolveSkillAlias(normalized);
    const skill = skillDefinitions.get(normalized) || skillDefinitions.get(aliasKey);
    const cost = skill?.cost ?? (normalized.includes('x2') ? 2 : 1);
    return {
      name,
      stat: skill?.stat ?? '',
      cost,
      category: skill?.category ?? 'misc',
      required: Boolean(skill?.required) || requiredSkillSet.has(normalized),
    };
  };

  const calcSkillBase = (stats, statKey, level) => {
    if (!statKey) return '';
    const statValue = Number(stats?.[statKey]);
    if (!Number.isFinite(statValue)) return '';
    const lvl = Number(level) || 0;
    return statValue + lvl;
  };
  const creationMethod = sheet.criacao?.metodo || '';
  const roleConfirmed = Boolean(sheet.criacao?.papelConfirmado);
  const statsTable = useMemo(
    () => selectedRole?.geracaoPersonagem?.ratoDeRua?.tabelaEstatisticas || [],
    [selectedRole]
  );
  const ratoSkills = useMemo(
    () => selectedRole?.geracaoPersonagem?.ratoDeRua?.habilidadesIniciais || [],
    [selectedRole]
  );
  const edgerunnerSkills = useMemo(
    () => selectedRole?.geracaoPersonagem?.edgerunner?.listaHabilidades || [],
    [selectedRole]
  );
  const fullSkillNames = useMemo(() => {
    const names = SKILL_LIBRARY.map((skill) => skill.name);
    return Array.from(new Set(names));
  }, []);
  const skillRowsAll = useMemo(() => {
    if (creationMethod === 'ratos_de_rua') {
      return ratoSkills.map((skill) => {
        const name = skill.nome || '';
        const meta = resolveSkillDefinition(name);
        return {
          ...meta,
          name,
          level: Math.max(0, Number(skill.nivel) || 0),
        };
      });
    }
    const list =
      creationMethod === 'edgerunner'
        ? edgerunnerSkills
        : fullSkillNames;
    return list.map((name) => {
      const meta = resolveSkillDefinition(name);
      const current = sheet.habilidades?.[name];
      const level = Math.max(0, Number(current?.nivel) || 0);
      return {
        ...meta,
        name,
        level,
      };
    });
  }, [creationMethod, edgerunnerSkills, fullSkillNames, ratoSkills, sheet.habilidades]);
  const skillRowsVisible = useMemo(() => {
    if (skillCategory === 'all') return skillRowsAll;
    return skillRowsAll.filter((row) => row.category === skillCategory);
  }, [skillCategory, skillRowsAll]);
  const skillPointsSpent = useMemo(() => {
    if (creationMethod === 'ratos_de_rua') return 0;
    return skillRowsAll.reduce((sum, row) => sum + (row.level || 0) * (row.cost || 1), 0);
  }, [creationMethod, skillRowsAll]);
  const skillPointsTotal = 86;
  const skillPointsRemaining = skillPointsTotal - skillPointsSpent;
  const skillLevelsValid =
    creationMethod === 'ratos_de_rua'
      ? true
      : skillRowsAll.every((row) => row.level >= 0 && row.level <= 6);
  const skillRequiredValid =
    creationMethod === 'ratos_de_rua'
      ? true
      : skillRowsAll.filter((row) => row.required).every((row) => row.level >= 2);
  const skillPointsValid =
    creationMethod === 'ratos_de_rua' ? true : skillPointsSpent === skillPointsTotal;
  const skillsValid =
    creationMethod === 'edgerunner' || creationMethod === 'pacote_completo'
      ? skillLevelsValid && skillRequiredValid && skillPointsValid
      : true;
  const statsTotal = useMemo(
    () => STAT_KEYS.reduce((sum, key) => sum + (Number(sheet.estatisticas[key]) || 0), 0),
    [sheet.estatisticas]
  );
  const statsComplete = useMemo(
    () =>
      STAT_KEYS.every((key) => sheet.estatisticas[key] !== '' && Number.isFinite(Number(sheet.estatisticas[key]))),
    [sheet.estatisticas]
  );
  const statsInRange = useMemo(
    () =>
      STAT_KEYS.every((key) => {
        const value = Number(sheet.estatisticas[key]);
        return Number.isFinite(value) && value >= 2 && value <= 8;
      }),
    [sheet.estatisticas]
  );
  const statsValid =
    creationMethod === 'pacote_completo'
      ? statsComplete && statsInRange && statsTotal === 62
      : statsComplete && statsInRange;
  const bodyValue = toNumber(sheet.estatisticas.BODY);
  const willValue = toNumber(sheet.estatisticas.WILL);
  const empValue = toNumber(sheet.estatisticas.EMP);

  const gearBudgets = useMemo(() => {
    if (creationMethod === 'pacote_completo') {
      return { general: 2550, fashion: 800 };
    }
    if (creationMethod === 'ratos_de_rua' || creationMethod === 'edgerunner') {
      return { general: 500, fashion: 0 };
    }
    return { general: 0, fashion: 0 };
  }, [creationMethod]);

  const gearSpent = useMemo(
    () =>
      gearCart.reduce(
        (acc, entry) => {
          const price = Number(entry.priceEb ?? entry.item?.priceEb ?? 0) || 0;
          const total = price * (Number(entry.quantity) || 1);
          if (entry.budget === 'fashion') {
            acc.fashion += total;
          } else {
            acc.general += total;
          }
          return acc;
        },
        { general: 0, fashion: 0 }
      ),
    [gearCart]
  );

  const gearRemainingGeneral = gearBudgets.general - gearSpent.general;
  const gearRemainingFashion = gearBudgets.fashion - gearSpent.fashion;

  const purchasableItems = useMemo(
    () =>
      catalogItems.filter(
        (item) => item && item.category !== 'services' && item.category !== 'housing'
      ),
    [catalogItems]
  );

  const filteredShopItems = useMemo(() => {
    const query = shopSearch.trim().toLowerCase();
    return purchasableItems.filter((item) => {
      if (shopCategory !== 'all' && item.category !== shopCategory) return false;
      if (!query) return true;
      const nameMatch = item.name?.toLowerCase().includes(query);
      const descMatch = item.description?.toLowerCase().includes(query);
      return nameMatch || descMatch;
    });
  }, [purchasableItems, shopCategory, shopSearch]);

  const handleRoleSelect = (roleName) => {
    const role = ROLE_LIBRARY.find((entry) => entry.papel === roleName) || null;
    playSound('button');
    setSheet((prev) => ({
      ...prev,
      criacao: {
        ...(prev.criacao || {}),
        papelConfirmado: false,
      },
      identificacao: {
        ...prev.identificacao,
        papel: role?.papel ?? roleName,
        rankHabilidadePapel: role ? 4 : prev.identificacao.rankHabilidadePapel,
        habilidadePapel: role?.habilidadePapel?.nome ?? '',
        habilidadePapelDescricao: role?.habilidadePapel?.descricao ?? '',
      },
    }));
  };

  const handleMethodSelect = (method) => {
    playSound('button');
    setSheet((prev) => ({
      ...prev,
      criacao: {
        ...(prev.criacao || {}),
        metodo: method,
      },
    }));
  };

  const handleConfirmRole = () => {
    if (!sheet.identificacao.papel) return;
    playSound('button');
    setSheet((prev) => ({
      ...prev,
      criacao: {
        ...(prev.criacao || {}),
        papelConfirmado: true,
      },
    }));
  };

  useEffect(() => {
    if (!campaignId || !playerId) {
      setSheet(cloneValue(EMPTY_SHEET));
      setHydrated(false);
      return;
    }

    const unsubscribe = subscribeStoredState({
      campaignId,
      playerId,
      scope: SHEET_SCOPE,
      fallback: EMPTY_SHEET,
      onChange: (data) => {
        setSheet(mergeDeep(EMPTY_SHEET, data || {}));
        setHydrated(true);
      },
    });

    return unsubscribe;
  }, [campaignId, playerId]);

  useEffect(() => {
    if (!campaignId) {
      setCatalogItems(SHOP_ITEMS);
      return;
    }

    const unsubscribe = subscribeStoredState({
      campaignId,
      playerId: '__system__',
      scope: 'shop_catalog_custom',
      fallback: [],
      onChange: (data) => {
        const customItems = Array.isArray(data) ? data : [];
        if (customItems.length === 0) {
          setCatalogItems(SHOP_ITEMS);
          return;
        }

        const overrides = new Map(customItems.map((item) => [item.id, item]));
        const base = SHOP_ITEMS.map((item) => (overrides.has(item.id) ? { ...item, ...overrides.get(item.id) } : item));
        const extra = customItems.filter((item) => !baseItemIds.has(item.id));
        setCatalogItems([...extra, ...base]);
      },
    });

    return unsubscribe;
  }, [baseItemIds, campaignId]);

  useEffect(() => {
    if (!campaignId || !playerId) return;
    const unsubscribe = subscribeStoredState({
      campaignId,
      playerId,
      scope: 'inventory_grid',
      fallback: { gridCols: 10, gridRows: 6, items: [], possessions: [] },
      onChange: (data) => {
        setInventorySnapshot(data);
      },
    });
    return unsubscribe;
  }, [campaignId, playerId]);

  useEffect(() => {
    if (!campaignId || !playerId || !hydrated) return;
    setStoredState({
      campaignId,
      playerId,
      scope: SHEET_SCOPE,
      data: sheet,
    });
  }, [campaignId, hydrated, playerId, sheet]);

  useEffect(() => {
    setGearCart([]);
    setGearStatus('');
    setSkillStatus('');
    setSkillCategory('all');
  }, [creationMethod]);

  useEffect(() => {
    const hasBody = Number.isFinite(bodyValue);
    const hasWill = Number.isFinite(willValue);
    const hasEmp = Number.isFinite(empValue);
    const hp = hasBody && hasWill ? 10 + 5 * Math.ceil((bodyValue + willValue) / 2) : '';
    const humanidade = hasEmp ? empValue * 10 : '';
    const seriouslyWounded = hp !== '' ? Math.ceil(hp / 2) : '';
    const deathSave = hasBody ? bodyValue : '';
    const nextDerived = {
      hp,
      hpMax: hp,
      seriouslyWounded,
      deathSave,
      humanidade,
      humanidadeMax: humanidade,
      empAtual: hasEmp ? empValue : '',
    };

    setSheet((prev) => {
      const current = prev.derivadas || {};
      const isSame = Object.keys(nextDerived).every((key) => current[key] === nextDerived[key]);
      if (isSame) return prev;
      return {
        ...prev,
        derivadas: {
          ...current,
          ...nextDerived,
        },
      };
    });
  }, [bodyValue, empValue, willValue]);

  useEffect(() => {
    if (!sheet.identificacao.papel) return;
    const roleKeyLocal = normalizeText(sheet.identificacao.papel);
    const isExec = roleKeyLocal === normalizeText('Exec');
    const isNomad = roleKeyLocal === normalizeText('Nomad');
    const defaultLifestyle = resolveOption(LIFESTYLE_OPTIONS, isExec ? 'good_prepak' : 'kibble');
    const defaultHousing = resolveOption(
      HOUSING_OPTIONS,
      isExec ? 'conapt_corp' : isNomad ? 'nomad_family_vehicle' : 'container'
    );
    setSheet((prev) => {
      let changed = false;
      const next = cloneValue(prev);
      if (!next.estiloVida?.tipo && defaultLifestyle) {
        next.estiloVida.tipo = defaultLifestyle.label;
        next.estiloVida.custoMensal = defaultLifestyle.cost ?? '';
        changed = true;
      }
      if (!next.moradia?.tipo && defaultHousing) {
        next.moradia.tipo = defaultHousing.label;
        next.moradia.aluguelMensal = defaultHousing.cost ?? '';
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [sheet.identificacao.papel]);

  useEffect(() => {
    if (creationMethod !== 'ratos_de_rua') return;
    if (!selectedRole?.papel) return;
    const list = selectedRole?.geracaoPersonagem?.ratoDeRua?.habilidadesIniciais || [];
    if (!list.length) return;
    setSheet((prev) => {
      if (prev.criacao?.habilidadesRatoDeRuaRole === selectedRole.papel) return prev;
      const next = cloneValue(prev);
      const skills = {};
      list.forEach((entry) => {
        const name = entry?.nome || '';
        if (!name) return;
        const meta = resolveSkillDefinition(name);
        const level = Math.max(0, Number(entry.nivel) || 0);
        skills[name] = {
          nivel: level,
          stat: meta.stat,
          base: calcSkillBase(next.estatisticas, meta.stat, level),
        };
      });
      next.habilidades = skills;
      next.criacao = {
        ...(next.criacao || {}),
        habilidadesRatoDeRuaRole: selectedRole.papel,
      };
      return next;
    });
  }, [creationMethod, selectedRole]);

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const totalSteps = wizardSteps.length;
  const handleStepChange = (nextIndex) => {
    const clamped = Math.min(Math.max(nextIndex, 0), totalSteps - 1);
    playSound('button');
    setActiveStep(clamped);
  };
  const canProceed =
    currentStep.id === 'metodo'
      ? Boolean(creationMethod)
      : currentStep.id === 'papel'
        ? Boolean(sheet.identificacao.papel) && roleConfirmed
        : currentStep.id === 'stats'
          ? statsValid
          : currentStep.id === 'skills'
            ? skillsValid
          : true;
  const handleNextStep = () => {
    if (!canProceed) return;
    handleStepChange(activeStep + 1);
  };
  const handlePrevStep = () => handleStepChange(activeStep - 1);

  const updateSection = (sectionKey, field, value) => {
    setSheet((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value,
      },
    }));
  };

  const handleLifestyleSelect = (optionId) => {
    const option = resolveOption(LIFESTYLE_OPTIONS, optionId);
    if (!option) return;
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.estiloVida.tipo = option.label;
      next.estiloVida.custoMensal = option.cost ?? '';
      return next;
    });
  };

  const handleHousingSelect = (optionId) => {
    const option = resolveOption(HOUSING_OPTIONS, optionId);
    if (!option) return;
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.moradia.tipo = option.label;
      next.moradia.aluguelMensal = option.cost ?? '';
      return next;
    });
  };

  const updateNested = (path, value) => {
    setSheet((prev) => {
      const next = cloneValue(prev);
      let pointer = next;
      for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        if (pointer[key] == null || typeof pointer[key] !== 'object') {
          pointer[key] = {};
        }
        pointer = pointer[key];
      }
      pointer[path[path.length - 1]] = value;
      return next;
    });
  };

  const resolveInventoryConfig = (item) => {
    if (!item) return null;
    if (NON_INVENTORY_CATEGORIES.includes(item.category)) return null;
    const base = INVENTORY_CATEGORY_DEFAULTS[item.category] || INVENTORY_CATEGORY_DEFAULTS.gear;
    const grid = item.grid ?? base;
    if (!grid) return null;
    return {
      w: grid.w,
      h: grid.h,
      color: item.color ?? grid.color ?? base?.color ?? '#4d80ff',
    };
  };

  const appendSheetItems = (entries) => {
    if (!entries?.length) return;
    setSheet((prev) => {
      const next = cloneValue(prev);
      const existing = new Map((next.equipamento?.itens || []).map((item) => [item.nome, { ...item }]));
      entries.forEach(({ name, quantity }) => {
        if (!name) return;
        const current = existing.get(name) || { nome: name, quantidade: 0 };
        const nextQty = (Number(current.quantidade) || 0) + (Number(quantity) || 1);
        existing.set(name, { ...current, quantidade: nextQty });
      });
      next.equipamento.itens = Array.from(existing.values());
      return next;
    });
  };

  const applyItemsToInventory = async (entries) => {
    if (!campaignId || !playerId || !entries?.length) return;
    const inventoryData = await getStoredState({
      campaignId,
      playerId,
      scope: 'inventory_grid',
      fallback: { gridCols: 10, gridRows: 6, items: [], possessions: [] },
    });

    const gridCols = Number(inventoryData?.gridCols) || 10;
    const gridRows = Number(inventoryData?.gridRows) || 6;
    const currentItems = Array.isArray(inventoryData?.items) ? inventoryData.items : [];
    const currentPossessions = Array.isArray(inventoryData?.possessions) ? inventoryData.possessions : [];

    const nextItems = [...currentItems];
    const nextPossessions = [...currentPossessions];

    entries.forEach((entry) => {
      const item = entry.item || {};
      const quantity = Math.max(1, Number(entry.quantity) || 1);
      const gridConfig = resolveInventoryConfig(item);
      const isAmmo = item.category === 'ammo';
      const packSize = isAmmo ? parsePackSize(item.priceNote) : 1;
      const rounds = isAmmo
        ? Number.isFinite(Number(entry.rounds))
          ? Number(entry.rounds)
          : quantity * packSize
        : quantity;
      const totalRounds = isAmmo ? Math.max(1, rounds) : quantity;

      if (gridConfig) {
        if (isAmmo) {
          const packCount = Math.ceil(totalRounds / packSize);
          for (let index = 0; index < packCount; index += 1) {
            const insertIndex = nextItems.length;
            const packQty =
              index === packCount - 1 ? totalRounds - packSize * (packCount - 1) : packSize;
            nextItems.push({
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              itemId: item.id ?? '',
              name: item.name ?? 'Item',
              w: gridConfig.w,
              h: gridConfig.h,
              rotated: false,
              stackQty: packQty,
              color: gridConfig.color,
              imageUrl: item.imageUrl ?? '',
              location: 'pool',
              x: 10 + (insertIndex % 4) * 14,
              y: 10 + (insertIndex % 6) * 14,
            });
          }
        } else {
          for (let index = 0; index < quantity; index += 1) {
            const insertIndex = nextItems.length;
            nextItems.push({
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              itemId: item.id ?? '',
              name: item.name ?? 'Item',
              w: gridConfig.w,
              h: gridConfig.h,
              rotated: false,
              stackQty: 1,
              color: gridConfig.color,
              imageUrl: item.imageUrl ?? '',
              location: 'pool',
              x: 10 + (insertIndex % 4) * 14,
              y: 10 + (insertIndex % 6) * 14,
            });
          }
        }
      }

      const categoryId = item.category ?? 'gear';
      const categoryLabel = item.categoryLabel ?? findLabel(CATEGORY_FILTERS, categoryId);
      const existingIndex = nextPossessions.findIndex((pos) =>
        (item.id && pos.itemId === item.id) || (!item.id && pos.name === item.name)
      );
      if (existingIndex >= 0) {
        const existing = nextPossessions[existingIndex];
        nextPossessions[existingIndex] = {
          ...existing,
          quantity: (Number(existing.quantity) || 1) + (isAmmo ? totalRounds : quantity),
        };
      } else {
        nextPossessions.unshift({
          id: item.id ?? `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          itemId: item.id ?? '',
          name: item.name ?? 'Item',
          category: categoryLabel,
          priceEb: item.priceEb ?? 0,
          priceTier: item.priceTier ?? '',
          source: item.source ?? '',
          quantity: isAmmo ? totalRounds : quantity,
          grid: gridConfig ? { w: gridConfig.w, h: gridConfig.h } : item.grid ?? null,
          imageUrl: item.imageUrl ?? '',
          equipped: false,
        });
      }
    });

    setStoredState({
      campaignId,
      playerId,
      scope: 'inventory_grid',
      data: {
        gridCols,
        gridRows,
        items: nextItems,
        possessions: nextPossessions,
      },
    });
  };

  const clampStatValue = (value, min = 2, max = 8) => {
    if (value === '') return '';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '';
    return Math.min(max, Math.max(min, parsed));
  };

  const setStatValue = (key, rawValue, options = {}) => {
    const nextValue = options.clamp ? clampStatValue(rawValue) : rawValue;
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.estatisticas[key] = nextValue;
      if (key === 'LUCK') {
        next.estatisticas.maxLUCK = nextValue;
      }
      return next;
    });
  };

  const applyStatRow = (row) => {
    if (!row) return;
    setSheet((prev) => {
      const next = cloneValue(prev);
      STAT_KEYS.forEach((key) => {
        next.estatisticas[key] = row[key];
      });
      next.estatisticas.maxLUCK = row.LUCK;
      return next;
    });
  };

  const handleStatsRollAll = () => {
    if (!statsTable.length) return;
    const roll = rollDie(statsTable.length);
    setStatsRoll(roll);
    applyStatRow(statsTable[roll - 1]);
  };

  const handleStatsRollSingle = (key) => {
    if (!statsTable.length) return;
    const roll = rollDie(statsTable.length);
    const row = statsTable[roll - 1];
    if (!row) return;
    setStatValue(key, row[key]);
  };

  const updateLifepath = (field, value) => updateSection('lifepath', field, value);

  const handleOriginSelect = (origin) => {
    if (!origin) return;
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.origemCultural = origin.regiao;
      next.lifepath.linguasDisponiveis = origin.linguas;
      if (!origin.linguas.includes(next.lifepath.linguaNativa)) {
        next.lifepath.linguaNativa = '';
        next.lifepath.linguaNativaNivel = 4;
        next.lifepath.linguas = [];
      }
      return next;
    });
  };

  const handleOriginRoll = () => {
    const roll = rollDie(LIFEPATH_ORIGENS.length);
    const origin = LIFEPATH_ORIGENS[roll - 1];
    handleOriginSelect(origin);
  };

  const handleNativeLanguageSelect = (lang) => {
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.linguaNativa = lang;
      next.lifepath.linguaNativaNivel = 4;
      next.lifepath.linguas = lang ? [`${lang} (4)`] : [];
      return next;
    });
  };

  const handleRollFriendsCount = () => {
    const count = Math.max(0, rollDie(10) - 7);
    const friends = Array.from({ length: count }, () => ({ relacao: '' }));
    updateLifepath('amigos', friends);
  };

  const handleFriendRelationRoll = (index) => {
    const { value } = rollFromList(LIFEPATH_RELACAO_AMIGOS);
    setSheet((prev) => {
      const next = cloneValue(prev);
      const friends = [...(next.lifepath.amigos || [])];
      friends[index] = { ...(friends[index] || {}), relacao: value };
      next.lifepath.amigos = friends;
      return next;
    });
  };

  const handleRollEnemiesCount = () => {
    const count = Math.max(0, rollDie(10) - 7);
    const enemies = Array.from({ length: count }, () => ({
      quem: '',
      causa: '',
      injusticado: '',
      poder: '',
      vinganca: '',
    }));
    updateLifepath('inimigos', enemies);
  };

  const handleEnemyFieldUpdate = (index, field, value) => {
    setSheet((prev) => {
      const next = cloneValue(prev);
      const enemies = [...(next.lifepath.inimigos || [])];
      enemies[index] = { ...(enemies[index] || {}), [field]: value };
      next.lifepath.inimigos = enemies;
      return next;
    });
  };

  const handleEnemyRoll = (index, field, list) => {
    const { value } = rollFromList(list);
    handleEnemyFieldUpdate(index, field, value);
  };

  const handleRollLoveCount = () => {
    const count = Math.max(0, rollDie(10) - 7);
    const loves = Array.from({ length: count }, () => ({ fim: '' }));
    updateLifepath('amoresTragicos', loves);
  };

  const handleLoveRoll = (index) => {
    const { value } = rollFromList(LIFEPATH_AMOR);
    setSheet((prev) => {
      const next = cloneValue(prev);
      const loves = [...(next.lifepath.amoresTragicos || [])];
      loves[index] = { ...(loves[index] || {}), fim: value };
      next.lifepath.amoresTragicos = loves;
      return next;
    });
  };

  const handleRoleSpecificUpdate = (key, value) => {
    setSheet((prev) => {
      const next = cloneValue(prev);
      const specific = { ...(next.lifepath.especifico || {}) };
      specific[key] = value;
      next.lifepath.especifico = specific;
      return next;
    });
  };

  const findCatalogMatch = (name) => {
    if (!name) return null;
    const normalized = normalizeText(name);
    if (!normalized) return null;
    const exact = catalogItems.find((item) => normalizeText(item.name) === normalized);
    if (exact) return exact;
    return catalogItems.find((item) => {
      const target = normalizeText(item.name);
      return target.includes(normalized) || normalized.includes(target);
    });
  };

  const handleApplyInitialEquipment = async (options = {}) => {
    const roleEquipment = selectedRole?.equipamentoInicial ?? null;
    if (!roleEquipment) {
      setGearStatus('Selecione um papel para aplicar o kit inicial.');
      return;
    }
    if (sheet.criacao?.equipamentoInicialAplicado && !options.force) {
      setGearStatus('Equipamento inicial ja foi aplicado.');
      return;
    }
    playSound('button');

    const entries = [];
    let extraCash = 0;

    (roleEquipment.armasEArmadura || []).forEach((entry) => {
      if (!entry?.item) return;
      if (normalizeText(entry.item).includes('dinheiro')) {
        extraCash += Number(entry.quantidade) || 0;
        return;
      }
      const match = findCatalogMatch(entry.item);
      if (match) {
        const isAmmo = match.category === 'ammo';
        entries.push({
          item: match,
          quantity: entry.quantidade || 1,
          rounds: isAmmo ? entry.quantidade || 1 : undefined,
        });
        return;
      }
      const category = guessCategoryFromName(entry.item);
      const isAmmo = category === 'ammo';
      entries.push({
        item: {
          id: `initial-${normalizeText(entry.item) || Date.now()}`,
          name: entry.item,
          category,
          priceEb: 0,
          priceTier: '',
          source: 'inicial',
        },
        quantity: entry.quantidade || 1,
        rounds: isAmmo ? entry.quantidade || 1 : undefined,
      });
    });

    (roleEquipment.programasCyberdeck || []).forEach((entry) => {
      if (!entry?.nome) return;
      entries.push({
        item: {
          id: `initial-${normalizeText(entry.nome) || Date.now()}`,
          name: entry.nome,
          category: 'gear',
          priceEb: 0,
          priceTier: '',
          source: 'inicial',
        },
        quantity: entry.quantidade || 1,
      });
    });

    if (entries.length) {
      await applyItemsToInventory(entries);
      appendSheetItems(
        entries.map((entry) => ({
          name: entry.item.name,
          quantity: entry.rounds ?? entry.quantity,
        }))
      );
    }

    setSheet((prev) => ({
      ...prev,
      criacao: {
        ...(prev.criacao || {}),
        equipamentoInicialAplicado: true,
      },
      equipamento: {
        ...prev.equipamento,
        dinheiro: extraCash || prev.equipamento.dinheiro || gearBudgets.general || '',
      },
    }));

    setGearStatus(options.force ? 'Kit reaplicado ao inventario.' : 'Equipamento inicial enviado ao inventario.');
  };

  const handleResetInitialEquipment = () => {
    playSound('button');
    setSheet((prev) => ({
      ...prev,
      criacao: {
        ...(prev.criacao || {}),
        equipamentoInicialAplicado: false,
      },
    }));
    setGearStatus('Kit liberado para aplicar novamente.');
  };

  const handleAddToCart = (item) => {
    if (!item) return;
    playSound('button');
    const budget = item.category === 'fashion' ? 'fashion' : 'general';
    const price = Number(item.priceEb) || 0;
    const remaining = budget === 'fashion' ? gearRemainingFashion : gearRemainingGeneral;
    if (remaining - price < 0) {
      setGearStatus('Saldo insuficiente para esta compra.');
      return;
    }
    setGearCart((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.item?.id === item.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: (Number(next[existingIndex].quantity) || 1) + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          item,
          quantity: 1,
          priceEb: item.priceEb ?? 0,
          budget,
        },
      ];
    });
    setGearStatus('');
  };

  const handleRemoveCartItem = (entry) => {
    if (!entry) return;
    playSound('button');
    setGearCart((prev) => {
      const index = prev.findIndex((item) => item.item?.id === entry.item?.id);
      if (index < 0) return prev;
      const target = prev[index];
      if ((Number(target.quantity) || 1) > 1) {
        const next = [...prev];
        next[index] = { ...target, quantity: (Number(target.quantity) || 1) - 1 };
        return next;
      }
      return prev.filter((item) => item.item?.id !== entry.item?.id);
    });
  };

  const handleCheckoutCart = async () => {
    if (!gearCart.length) return;
    playSound('button');
    await applyItemsToInventory(gearCart.map((entry) => ({ item: entry.item, quantity: entry.quantity })));
    appendSheetItems(
      gearCart.map((entry) => ({
        name: entry.item.name,
        quantity:
          entry.item?.category === 'ammo'
            ? (Number(entry.quantity) || 1) * parsePackSize(entry.item?.priceNote)
            : entry.quantity,
      }))
    );
    setSheet((prev) => ({
      ...prev,
      equipamento: {
        ...prev.equipamento,
        dinheiro: gearRemainingGeneral,
      },
    }));
    setGearCart([]);
    setGearStatus('Compras adicionadas ao inventario.');
  };

  const handleSkillLevelChange = (name, value) => {
    if (!name) return;
    const meta = resolveSkillDefinition(name);
    const currentLevel = Math.max(0, Number(sheet.habilidades?.[name]?.nivel) || 0);
    const parsed = value === '' ? 0 : Number(value);
    const nextLevel = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 6) : 0;

    if (creationMethod === 'edgerunner' || creationMethod === 'pacote_completo') {
      const nextPoints =
        skillPointsSpent - currentLevel * (meta.cost || 1) + nextLevel * (meta.cost || 1);
      if (nextPoints > skillPointsTotal) {
        setSkillStatus('Pontos insuficientes para esse nivel.');
        return;
      }
    }

    setSkillStatus('');
    setSheet((prev) => {
      const next = cloneValue(prev);
      const skills = { ...(next.habilidades || {}) };
      skills[name] = {
        ...(skills[name] || {}),
        nivel: nextLevel,
        stat: meta.stat,
        base: calcSkillBase(next.estatisticas, meta.stat, nextLevel),
      };
      next.habilidades = skills;
      return next;
    });
  };

  const handleSuggestMinimumSkills = () => {
    if (creationMethod !== 'edgerunner' && creationMethod !== 'pacote_completo') return;
    setSkillStatus('');
    setSheet((prev) => {
      const next = cloneValue(prev);
      const skills = { ...(next.habilidades || {}) };
      skillRowsAll
        .filter((row) => row.required)
        .forEach((row) => {
          const current = skills[row.name] || {};
          const currentLevel = Math.max(0, Number(current.nivel) || 0);
          const level = Math.max(2, currentLevel);
          skills[row.name] = {
            ...current,
            nivel: level,
            stat: row.stat,
            base: calcSkillBase(next.estatisticas, row.stat, level),
          };
        });
      next.habilidades = skills;
      return next;
    });
  };

  const handleAddSkill = () => {
    const name = newSkillName.trim();
    if (!name) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      const skills = { ...(next.habilidades || {}) };
      skills[name] = {
        nivel: toNumber(newSkillNivel),
        stat: newSkillStat.trim(),
        base: toNumber(newSkillBase),
      };
      next.habilidades = skills;
      return next;
    });
    setNewSkillName('');
    setNewSkillNivel('');
    setNewSkillStat('');
    setNewSkillBase('');
  };

  const handleSkillUpdate = (name, field, value) => {
    setSheet((prev) => {
      const next = cloneValue(prev);
      const skills = { ...(next.habilidades || {}) };
      const current = skills[name] || {};
      skills[name] = { ...current, [field]: value };
      next.habilidades = skills;
      return next;
    });
  };

  const handleRemoveSkill = (name) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      const skills = { ...(next.habilidades || {}) };
      delete skills[name];
      next.habilidades = skills;
      return next;
    });
  };

  const handleAddWeapon = () => {
    if (!newWeapon.nome.trim()) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.combate.armas = [
        ...next.combate.armas,
        {
          ...newWeapon,
          municao: toNumber(newWeapon.municao),
          municaoMax: toNumber(newWeapon.municaoMax),
          cdt: toNumber(newWeapon.cdt),
        },
      ];
      return next;
    });
    setNewWeapon({
      nome: '',
      tipo: '',
      dano: '',
      municao: '',
      municaoMax: '',
      cdt: '',
      habilidade: '',
      qualidade: '',
    });
  };

  const handleUpdateWeapon = (index, field, value) => {
    setSheet((prev) => {
      const next = cloneValue(prev);
      const updated = { ...next.combate.armas[index], [field]: value };
      next.combate.armas[index] = updated;
      return next;
    });
  };

  const handleRemoveWeapon = (index) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.combate.armas = next.combate.armas.filter((_, idx) => idx !== index);
      return next;
    });
  };

  const handleAddCyberOption = () => {
    const nome = newCyberOption.nome.trim();
    if (!nome) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.cyberware.neuralware.opcoes = [
        ...next.cyberware.neuralware.opcoes,
        {
          nome,
          slot: toNumber(newCyberOption.slot),
        },
      ];
      return next;
    });
    setNewCyberOption({ nome: '', slot: '' });
  };

  const handleRemoveCyberOption = (index) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.cyberware.neuralware.opcoes = next.cyberware.neuralware.opcoes.filter((_, idx) => idx !== index);
      return next;
    });
  };

  const handleAddOptic = (side) => {
    const value = side === 'left' ? newLeftOptic.trim() : newRightOptic.trim();
    if (!value) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      const target = side === 'left'
        ? next.cyberware.cyberopticos.olhoEsquerdo
        : next.cyberware.cyberopticos.olhoDireito;
      target.opcoes = [...target.opcoes, value];
      return next;
    });
    if (side === 'left') setNewLeftOptic('');
    if (side === 'right') setNewRightOptic('');
  };

  const handleRemoveOptic = (side, index) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      const target = side === 'left'
        ? next.cyberware.cyberopticos.olhoEsquerdo
        : next.cyberware.cyberopticos.olhoDireito;
      target.opcoes = target.opcoes.filter((_, idx) => idx !== index);
      return next;
    });
  };

  const handleAddReputationEvent = () => {
    if (!newReputationEvent.descricao.trim()) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.reputacao.eventos = [
        ...next.reputacao.eventos,
        {
          descricao: newReputationEvent.descricao.trim(),
          nivel: toNumber(newReputationEvent.nivel),
        },
      ];
      return next;
    });
    setNewReputationEvent({ descricao: '', nivel: '' });
  };

  const handleRemoveReputationEvent = (index) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.reputacao.eventos = next.reputacao.eventos.filter((_, idx) => idx !== index);
      return next;
    });
  };

  const handleAddAmmo = () => {
    const tipo = newAmmo.tipo.trim();
    if (!tipo) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.equipamento.municao = {
        ...next.equipamento.municao,
        [tipo]: toNumber(newAmmo.quantidade),
      };
      return next;
    });
    setNewAmmo({ tipo: '', quantidade: '' });
  };

  const handleRemoveAmmo = (tipo) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      const updated = { ...next.equipamento.municao };
      delete updated[tipo];
      next.equipamento.municao = updated;
      return next;
    });
  };

  const handleAddGrenade = () => {
    const tipo = newGrenade.tipo.trim();
    if (!tipo) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.equipamento.granadas = {
        ...next.equipamento.granadas,
        [tipo]: toNumber(newGrenade.quantidade),
      };
      return next;
    });
    setNewGrenade({ tipo: '', quantidade: '' });
  };

  const handleRemoveGrenade = (tipo) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      const updated = { ...next.equipamento.granadas };
      delete updated[tipo];
      next.equipamento.granadas = updated;
      return next;
    });
  };

  const handleAddItem = () => {
    const nome = newItem.nome.trim();
    if (!nome) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.equipamento.itens = [
        ...next.equipamento.itens,
        { nome, quantidade: toNumber(newItem.quantidade) },
      ];
      return next;
    });
    setNewItem({ nome: '', quantidade: '' });
  };

  const handleUpdateItem = (index, field, value) => {
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.equipamento.itens[index] = {
        ...next.equipamento.itens[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleRemoveItem = (index) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.equipamento.itens = next.equipamento.itens.filter((_, idx) => idx !== index);
      return next;
    });
  };

  const renderSection = (section) => {
    if (section.id === 'identificacao') {
      return (
        <details key={section.id} className="character-section" open={section.open}>
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Nome"
                value={sheet.identificacao.nome}
                onChange={(event) => updateSection('identificacao', 'nome', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Handle"
                value={sheet.identificacao.handle}
                onChange={(event) => updateSection('identificacao', 'handle', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Papel"
                value={sheet.identificacao.papel}
                readOnly
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Rank"
                value={sheet.identificacao.rankHabilidadePapel}
                onChange={(event) =>
                  updateSection('identificacao', 'rankHabilidadePapel', toNumber(event.target.value))
                }
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Idade"
                value={sheet.identificacao.idade}
                onChange={(event) => updateSection('identificacao', 'idade', toNumber(event.target.value))}
              />
              <input
                className="entry-input"
                placeholder="Foto (URL)"
                value={sheet.identificacao.foto}
                onChange={(event) => updateSection('identificacao', 'foto', event.target.value)}
              />
            </div>
            {sheet.identificacao.foto ? (
              <img className="entry-image-preview" src={sheet.identificacao.foto} alt="Foto do personagem" />
            ) : null}
          </div>
        </details>
      );
    }

    if (section.id === 'papeis') {
      const roleAbility = selectedRole?.habilidadePapel ?? null;
      const roleFanConversion = roleAbility?.conversaoFas ?? null;
      const roleAbilitySkills = Array.isArray(roleAbility?.habilidades) ? roleAbility.habilidades : [];
      const roleAbilityRanks = Array.isArray(roleAbility?.efeitosPorRank) ? roleAbility.efeitosPorRank : [];
      const roleAbilityActions = Array.isArray(roleAbility?.acoesPorRank) ? roleAbility.acoesPorRank : [];
      const roleAbilityInterfaces = Array.isArray(roleAbility?.habilidadesInterface)
        ? roleAbility.habilidadesInterface
        : [];
      const roleGeneration = selectedRole?.geracaoPersonagem ?? null;
      const roleEquipment = selectedRole?.equipamentoInicial ?? null;
      const roleLifepath = selectedRole?.lifepathEspecifico ?? null;
      const roleExample = selectedRole?.exemploPersonagem ?? null;
      return (
        <details key={section.id} className="character-section" open={section.open}>
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="role-select-grid">
              {ROLE_LIBRARY.map((role) => {
                const isSelected = role.papel === sheet.identificacao.papel;
                const shortDescription = shortenText(role.descricao, 140);
                return (
                  <button
                    key={role.papel}
                    type="button"
                    className={`role-card ${isSelected ? 'is-selected' : ''}`}
                    data-tooltip={shortDescription}
                    onClick={() => handleRoleSelect(role.papel)}
                  >
                    <span className="role-card-title">{role.papel}</span>
                    <span className="role-card-ability">{role.habilidadePapel?.nome || 'Habilidade de Papel'}</span>
                    <span className="role-card-meta">Rank inicial 4</span>
                  </button>
                );
              })}
            </div>

            {!selectedRole ? (
              <div className="placeholder-box">Escolha um papel para ver o resumo.</div>
            ) : (
              <>
                <div className="role-summary">
                <div className="role-summary-header">
                  <div className="role-summary-title">{selectedRole.papel}</div>
                  <div className="role-summary-tags">
                    <span className="role-summary-tag">
                      Rank {sheet.identificacao.rankHabilidadePapel || 4}
                    </span>
                      {roleAbility?.nome ? <span className="role-summary-tag">{roleAbility.nome}</span> : null}
                    </div>
                  </div>
                  <div className="role-summary-text">{selectedRole.descricao}</div>
                  {roleAbility?.descricao ? (
                    <div className="role-summary-sub">{roleAbility.descricao}</div>
                  ) : null}
                </div>
                <div className="role-summary-note">Habilidade de Papel aparece automaticamente na aba de Habilidades.</div>
                <div className="role-summary-actions">
                  <button
                    type="button"
                    className="mission-action-btn edit"
                    onClick={handleConfirmRole}
                    disabled={!sheet.identificacao.papel}
                  >
                    {roleConfirmed ? 'PAPEL SELECIONADO' : 'SELECIONAR PAPEL'}
                  </button>
                </div>

                <div className="role-details-block">
                <details className="character-section">
                  <summary className="character-section-title">Habilidade de Papel</summary>
                  <div className="character-section-body">
                    {roleAbility ? (
                      <div className="entry-card">
                        <div className="entry-card-title">{roleAbility.nome}</div>
                        <div className="entry-card-text">{roleAbility.descricao}</div>
                      </div>
                    ) : null}

                    {roleFanConversion ? (
                      <div className="entry-card">
                        <div className="entry-card-title">Conversao de fas</div>
                        <div className="entry-card-text">{roleFanConversion.regra}</div>
                        <div className="entries-list">
                          {roleFanConversion.tabela.map((row) => (
                            <div key={row.grupo} className="entry-card">
                              <div className="entry-card-title">
                                {row.grupo} (DV {row.dv})
                              </div>
                              <div className="entry-card-text">{row.condicao}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {roleAbilitySkills.length ? (
                      <div className="entries-list">
                        {roleAbilitySkills.map((skill) => (
                          <div key={skill.nome} className="entry-card">
                            <div className="entry-card-title">{skill.nome}</div>
                            <div className="entry-card-text">{skill.descricao}</div>
                            {Array.isArray(skill.custos) ? (
                              <div className="entries-list">
                                {skill.custos.map((cost) => (
                                  <div key={`${skill.nome}-${cost.pontos}`} className="entry-card">
                                    <div className="entry-card-title">Custo: {cost.pontos}</div>
                                    <div className="entry-card-text">{cost.efeito}</div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {skill.custo != null ? (
                              <div className="entry-card-text">Custo: {skill.custo}</div>
                            ) : null}
                            {skill.efeito ? <div className="entry-card-text">{skill.efeito}</div> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {roleAbilityActions.length ? (
                      <div className="entry-card">
                        <div className="entry-card-title">Acoes por rank</div>
                        <div className="entries-list">
                          {roleAbilityActions.map((row) => (
                            <div key={row.rank} className="entry-card">
                              <div className="entry-card-title">Rank {row.rank}</div>
                              <div className="entry-card-text">Acoes NET: {row.acoesNET}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {roleAbilityInterfaces.length ? (
                      <div className="entry-card">
                        <div className="entry-card-title">Habilidades de Interface</div>
                        <div className="entries-list">
                          {roleAbilityInterfaces.map((entry) => (
                            <div key={entry.nome} className="entry-card">
                              <div className="entry-card-title">{entry.nome}</div>
                              <div className="entry-card-text">{entry.descricao}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {roleAbilityRanks.length ? (
                      <div className="entries-list">
                        {roleAbilityRanks.map((rankInfo) => (
                          <div key={rankInfo.rank} className="entry-card">
                            <div className="entry-card-title">Rank {rankInfo.rank}</div>
                            <div className="entry-card-text">Locais: {rankInfo.locaisParaTocar}</div>
                            <div className="entry-card-text">Fa unico: {rankInfo.impactoUnicoFa}</div>
                            <div className="entry-card-text">Pequeno grupo: {rankInfo.impactoPequenoGrupo}</div>
                            <div className="entry-card-text">Grande grupo: {rankInfo.impactoGrandeGrupo}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>

                <details className="character-section">
                  <summary className="character-section-title">Geracao de Personagem</summary>
                  <div className="character-section-body">
                    {roleGeneration?.ratoDeRua ? (
                      <div className="entry-card">
                        <div className="entry-card-title">Rato de Rua</div>
                        <div className="entry-card-text">{roleGeneration.ratoDeRua.descricao}</div>
                        {Array.isArray(roleGeneration.ratoDeRua.tabelaEstatisticas) ? (
                          <div className="entries-list">
                            {roleGeneration.ratoDeRua.tabelaEstatisticas.map((row) => (
                              <div key={row.roll} className="entry-card">
                                <div className="entry-card-title">Roll {row.roll}</div>
                                <div className="entry-card-text">
                                  INT {row.INT} | REF {row.REF} | DEX {row.DEX} | TECH {row.TECH} | COOL {row.COOL} | WILL{' '}
                                  {row.WILL} | LUCK {row.LUCK} | MOVE {row.MOVE} | BODY {row.BODY} | EMP {row.EMP}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {Array.isArray(roleGeneration.ratoDeRua.habilidadesIniciais) ? (
                          <div className="entry-card">
                            <div className="entry-card-title">Habilidades iniciais</div>
                            <div className="entry-actions">
                              {roleGeneration.ratoDeRua.habilidadesIniciais.map((skill) => (
                                <span key={skill.nome} className="entry-tag">
                                  {skill.nome} ({skill.nivel})
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {roleGeneration?.edgerunner ? (
                      <div className="entry-card">
                        <div className="entry-card-title">Edgerunner</div>
                        <div className="entry-card-text">{roleGeneration.edgerunner.descricao}</div>
                        {Array.isArray(roleGeneration.edgerunner.listaHabilidades) ? (
                          <>
                            <div className="entry-card-text">Lista de habilidades:</div>
                            <div className="entry-actions">
                              {roleGeneration.edgerunner.listaHabilidades.map((skill) => (
                                <span key={skill} className="entry-tag">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : null}
                        {Array.isArray(roleGeneration.edgerunner.habilidadesObrigatoriasMinimo2) ? (
                          <>
                            <div className="entry-card-text">Obrigatorias (min 2):</div>
                            <div className="entry-actions">
                              {roleGeneration.edgerunner.habilidadesObrigatoriasMinimo2.map((skill) => (
                                <span key={skill} className="entry-tag">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {roleGeneration?.pacoteCompleto ? (
                      <div className="entry-card">
                        <div className="entry-card-title">Pacote Completo</div>
                        <div className="entry-card-text">{roleGeneration.pacoteCompleto.descricao}</div>
                        {roleGeneration.pacoteCompleto.regras ? (
                          <>
                            <div className="entry-card-text">
                              Estatisticas: {roleGeneration.pacoteCompleto.regras.pontosEstatisticas} pontos (min{' '}
                              {roleGeneration.pacoteCompleto.regras.minimoEstatistica}, max{' '}
                              {roleGeneration.pacoteCompleto.regras.maximoEstatistica})
                            </div>
                            <div className="entry-card-text">
                              Habilidades: {roleGeneration.pacoteCompleto.regras.pontosHabilidade} pontos
                            </div>
                            <div className="entry-card-text">
                              Dinheiro inicial: {roleGeneration.pacoteCompleto.regras.dinheiroInicial} eb
                            </div>
                            <div className="entry-card-text">
                              Moda extra: {roleGeneration.pacoteCompleto.regras.dinheiroModaExtra} eb
                            </div>
                          </>
                        ) : null}
                        {Array.isArray(roleGeneration.pacoteCompleto.habilidadesObrigatoriasMinimo2) ? (
                          <>
                            <div className="entry-card-text">Obrigatorias (min 2):</div>
                            <div className="entry-actions">
                              {roleGeneration.pacoteCompleto.habilidadesObrigatoriasMinimo2.map((skill) => (
                                <span key={skill} className="entry-tag">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </details>

                <details className="character-section">
                  <summary className="character-section-title">Equipamento Inicial</summary>
                  <div className="character-section-body">
                    {Array.isArray(roleEquipment?.armasEArmadura) ? (
                      <div className="entries-list">
                        {roleEquipment.armasEArmadura.map((entry) => (
                          <div key={`${entry.item}-${entry.quantidade ?? entry.sp ?? ''}`} className="entry-card">
                            <div className="entry-card-title">{entry.item}</div>
                            {entry.quantidade != null ? (
                              <div className="entry-card-text">Qtd: {entry.quantidade}</div>
                            ) : null}
                            {entry.sp != null ? <div className="entry-card-text">SP: {entry.sp}</div> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {Array.isArray(roleEquipment?.programasCyberdeck) ? (
                      <div className="entry-card">
                        <div className="entry-card-title">Programas de Cyberdeck</div>
                        <div className="entries-list">
                          {roleEquipment.programasCyberdeck.map((entry) => (
                            <div key={entry.nome} className="entry-card">
                              <div className="entry-card-title">{entry.nome}</div>
                              <div className="entry-card-text">Qtd: {entry.quantidade}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {roleEquipment?.moda?.estilos ? (
                      <div className="entry-card">
                        <div className="entry-card-title">Moda - Estilos</div>
                        <div className="entry-actions">
                          {roleEquipment.moda.estilos.map((item) => (
                            <span key={item} className="entry-tag">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {roleEquipment?.moda?.adornos ? (
                      <div className="entry-card">
                        <div className="entry-card-title">Moda - Adornos</div>
                        <div className="entry-actions">
                          {roleEquipment.moda.adornos.map((item) => (
                            <span key={item} className="entry-tag">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </details>

                <details className="character-section">
                  <summary className="character-section-title">Lifepath Especifico</summary>
                  <div className="character-section-body">
                    {roleLifepath ? (
                      <div className="entries-list">
                        {Object.entries(roleLifepath).map(([key, entries]) => (
                          <div key={key} className="entry-card">
                            <div className="entry-card-title">
                              {key
                                .replace(/([A-Z])/g, ' $1')
                                .replace(/_/g, ' ')
                                .trim()}
                            </div>
                            {Array.isArray(entries) ? (
                              <div className="entries-list">
                                {entries.map((entry) => (
                                  <div key={`${entry.roll}-${entry.tipo ?? entry.descricao}`} className="entry-card">
                                    <div className="entry-card-title">Roll {entry.roll}</div>
                                    <div className="entry-card-text">{entry.tipo ?? entry.descricao}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="entry-card-text">{String(entries)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>

                <details className="character-section">
                  <summary className="character-section-title">Exemplo de Personagem</summary>
                  <div className="character-section-body">
                    {roleExample ? (
                      <>
                        <div className="entry-card">
                          <div className="entry-card-title">{roleExample.nome}</div>
                          <div className="entry-card-text">Handle: {roleExample.handle}</div>
                          <div className="entry-card-text">Rank: {roleExample.rankHabilidadePapel}</div>
                          {roleExample.origemCultural ? (
                            <div className="entry-card-text">Origem cultural: {roleExample.origemCultural}</div>
                          ) : null}
                          {Array.isArray(roleExample.linguas) ? (
                            <div className="entry-card-text">Linguas: {roleExample.linguas.join(', ')}</div>
                          ) : null}
                        </div>
                        {roleExample.estatisticas ? (
                          <div className="entry-card">
                            <div className="entry-card-title">Estatisticas</div>
                            <div className="entry-card-text">
                              {Object.entries(roleExample.estatisticas)
                                .map(([key, value]) => `${key} ${value}`)
                                .join(' | ')}
                            </div>
                          </div>
                        ) : null}
                        {roleExample.cyberware ? (
                          <div className="entry-card">
                            <div className="entry-card-title">Cyberware</div>
                            <div className="entry-card-text">
                              {Object.entries(roleExample.cyberware)
                                .map(([key, value]) => {
                                  if (Array.isArray(value)) {
                                    return `${key}: ${value.join(', ')}`;
                                  }
                                  if (value && typeof value === 'object') {
                                    return `${key}: ${JSON.stringify(value)}`;
                                  }
                                  return `${key}: ${value}`;
                                })
                                .join(' | ')}
                            </div>
                          </div>
                        ) : null}
                        {roleExample.habilidades ? (
                          <div className="entry-card">
                            <div className="entry-card-title">Habilidades</div>
                            <div className="entry-actions">
                              {Object.entries(roleExample.habilidades).map(([key, value]) => (
                                <span key={key} className="entry-tag">
                                  {key} ({value})
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {roleExample.equipamento ? (
                          <div className="entry-card">
                            <div className="entry-card-title">Equipamento</div>
                            {Object.entries(roleExample.equipamento).map(([key, value]) => {
                              if (Array.isArray(value)) {
                                return (
                                  <div key={key} className="entry-card-text">
                                    {key}: {value.join(', ')}
                                  </div>
                                );
                              }
                              if (value && typeof value === 'object') {
                                return (
                                  <div key={key} className="entry-card-text">
                                    {key}: {JSON.stringify(value)}
                                  </div>
                                );
                              }
                              return (
                                <div key={key} className="entry-card-text">
                                  {key}: {value}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </details>
                </div>
              </>
            )}
          </div>
        </details>
      );
    }

    if (section.id === 'estatisticas') {
      const remainingPoints = 62 - statsTotal;
      const isStreetRat = creationMethod === 'ratos_de_rua';
      const isEdgerunner = creationMethod === 'edgerunner';
      const isPacote = creationMethod === 'pacote_completo';

      return (
        <details key={section.id} className="character-section" open={section.open}>
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            {statsTable.length ? (
              <div className="stats-table">
                <div className="stats-table-title">
                  Tabela do papel: {selectedRole?.papel || 'Papel'}
                </div>
                <div className="stats-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Roll</th>
                        {STAT_KEYS.map((key) => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {statsTable.map((row) => (
                        <tr key={row.roll ?? row.INT}>
                          <td>{row.roll}</td>
                          {STAT_KEYS.map((key) => (
                            <td key={`${row.roll}-${key}`}>{row[key]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="lifepath-muted">Selecione um papel para ver a tabela de atributos.</div>
            )}

            <div className="stats-panel">
              {isStreetRat ? (
                <>
                  <div className="stats-roll-row">
                    <button className="mission-add-btn" type="button" onClick={handleStatsRollAll}>
                      ROLAR 1D10
                    </button>
                    <span className="stats-roll-info">
                      {statsRoll ? `Resultado: ${statsRoll}` : 'Role para preencher os atributos.'}
                    </span>
                  </div>
                  <div className="stats-attr-grid">
                    {STAT_KEYS.map((key) => (
                      <div key={key} className="stats-attr-card">
                        <div className="stats-attr-label">{key}</div>
                        <input className="entry-input" type="number" value={sheet.estatisticas[key]} disabled />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {isEdgerunner ? (
                <div className="stats-attr-grid">
                  {STAT_KEYS.map((key) => (
                    <div key={key} className="stats-attr-card">
                      <div className="stats-attr-label">{key}</div>
                      <div className="stats-attr-controls">
                        <input
                          className="entry-input"
                          type="number"
                          min={2}
                          max={8}
                          placeholder={key}
                          value={sheet.estatisticas[key]}
                          onChange={(event) => setStatValue(key, event.target.value, { clamp: true })}
                        />
                        <button
                          className="mission-add-btn"
                          type="button"
                          onClick={() => handleStatsRollSingle(key)}
                        >
                          ROLAR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {isPacote ? (
                <>
                  <div className={`stats-total ${statsTotal === 62 ? 'is-valid' : 'is-invalid'}`}>
                    <span>Total: {statsTotal} / 62</span>
                    <span>Restantes: {remainingPoints}</span>
                  </div>
                  <div className="stats-attr-grid">
                    {STAT_KEYS.map((key) => (
                      <div key={key} className="stats-attr-card">
                        <div className="stats-attr-label">{key}</div>
                        <input
                          className="entry-input"
                          type="number"
                          min={2}
                          max={8}
                          placeholder={key}
                          value={sheet.estatisticas[key]}
                          onChange={(event) => setStatValue(key, event.target.value, { clamp: true })}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {!isStreetRat && !isEdgerunner && !isPacote ? (
                <div className="lifepath-muted">Selecione um metodo de criacao para continuar.</div>
              ) : null}
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'derivadas') {
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <input
                className="entry-input"
                type="number"
                placeholder="HP"
                value={sheet.derivadas.hp}
                readOnly
              />
              <input
                className="entry-input"
                type="number"
                placeholder="HP Max"
                value={sheet.derivadas.hpMax}
                readOnly
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Ferimento Grave"
                value={sheet.derivadas.seriouslyWounded}
                readOnly
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Death Save"
                value={sheet.derivadas.deathSave}
                readOnly
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Humanidade"
                value={sheet.derivadas.humanidade}
                readOnly
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Humanidade Max"
                value={sheet.derivadas.humanidadeMax}
                readOnly
              />
              <input
                className="entry-input"
                type="number"
                placeholder="EMP Atual"
                value={sheet.derivadas.empAtual}
                readOnly
              />
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'habilidades') {
      const roleAbilityName =
        sheet.identificacao.habilidadePapel || selectedRole?.habilidadePapel?.nome || '';
      const roleAbilityDesc =
        sheet.identificacao.habilidadePapelDescricao || selectedRole?.habilidadePapel?.descricao || '';
      const roleRank = sheet.identificacao.rankHabilidadePapel || 4;
      const showEditable = creationMethod === 'edgerunner' || creationMethod === 'pacote_completo';
      const showReadonly = creationMethod === 'ratos_de_rua';
      const pointsState =
        skillPointsRemaining < 0 ? 'is-over' : skillPointsRemaining === 0 ? 'is-ok' : '';
      const nativeLanguage = sheet.lifepath?.linguaNativa || '';
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            {roleAbilityName ? (
              <div className="entry-card role-ability-card">
                <div className="entry-card-title">Habilidade de Papel</div>
                <div className="entry-card-text">
                  {roleAbilityName} (Rank {roleRank})
                </div>
                {roleAbilityDesc ? <div className="entry-card-text">{roleAbilityDesc}</div> : null}
              </div>
            ) : null}
            {creationMethod ? null : (
              <div className="placeholder-box">Selecione um metodo para configurar habilidades.</div>
            )}
            {showEditable ? (
              <>
                <div className="skills-toolbar">
                  <div className="skills-filters">
                    {SKILL_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`skills-filter-btn ${skillCategory === cat.id ? 'is-active' : ''}`}
                        onClick={() => setSkillCategory(cat.id)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className={`skills-points ${pointsState}`}>
                    Pontos: {skillPointsSpent}/{skillPointsTotal} | Restam: {skillPointsRemaining}
                  </div>
                  <button className="mission-action-btn edit" type="button" onClick={handleSuggestMinimumSkills}>
                    SUGERIR MINIMO
                  </button>
                </div>
                {skillStatus ? <div className="skills-status">{skillStatus}</div> : null}
                <div className="skills-table">
                  <div className="skills-row skills-header">
                    <div className="skills-cell name">Habilidade</div>
                    <div className="skills-cell stat">STAT</div>
                    <div className="skills-cell cost">Custo</div>
                    <div className="skills-cell level">Nivel</div>
                    <div className="skills-cell total">Total</div>
                  </div>
                  {skillRowsVisible.map((row) => (
                    <div key={row.name} className={`skills-row ${row.required ? 'is-required' : ''}`}>
                      <div className="skills-cell name">
                        {row.name}
                        {row.required ? <span className="skills-tag">Obrigatoria</span> : null}
                      </div>
                      <div className="skills-cell stat">{row.stat || '--'}</div>
                      <div className="skills-cell cost">{row.cost === 2 ? 'x2' : 'x1'}</div>
                      <div className="skills-cell level">
                        <input
                          className="entry-input"
                          type="number"
                          min="0"
                          max="6"
                          value={row.level}
                          onChange={(event) => handleSkillLevelChange(row.name, event.target.value)}
                        />
                      </div>
                      <div className="skills-cell total">{(row.level || 0) * (row.cost || 1)}</div>
                    </div>
                  ))}
                </div>
                <div className={`skills-validation ${skillsValid ? 'is-ok' : 'is-warn'}`}>
                  {skillsValid
                    ? 'Distribuicao valida. Pontos completos.'
                    : 'Preencha obrigatorias (min 2), niveis <=6 e totalize 86 pontos.'}
                </div>
              </>
            ) : null}
            {showReadonly ? (
              <>
                {ratoSkills.length ? (
                  <div className="skills-table">
                    <div className="skills-row skills-header">
                      <div className="skills-cell name">Habilidade</div>
                      <div className="skills-cell stat">STAT</div>
                      <div className="skills-cell cost">Custo</div>
                      <div className="skills-cell level">Nivel</div>
                      <div className="skills-cell total">Total</div>
                    </div>
                    {skillRowsAll.map((row) => (
                      <div key={row.name} className={`skills-row ${row.required ? 'is-required' : ''}`}>
                        <div className="skills-cell name">
                          {row.name}
                          {row.required ? <span className="skills-tag">Obrigatoria</span> : null}
                        </div>
                        <div className="skills-cell stat">{row.stat || '--'}</div>
                        <div className="skills-cell cost">{row.cost === 2 ? 'x2' : 'x1'}</div>
                        <div className="skills-cell level">{row.level}</div>
                        <div className="skills-cell total">{(row.level || 0) * (row.cost || 1)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="placeholder-box">Nenhuma habilidade inicial encontrada para o papel.</div>
                )}
              </>
            ) : null}
            {nativeLanguage ? (
              <div className="entry-card">
                <div className="entry-card-title">Idioma nativo</div>
                <div className="entry-card-text">
                  {nativeLanguage} (Nivel 4, gratis)
                </div>
              </div>
            ) : null}
          </div>
        </details>
      );
    }

    if (section.id === 'combate') {
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <input
                className="entry-input"
                type="number"
                placeholder="Iniciativa"
                value={sheet.combate.iniciativa}
                onChange={(event) => updateNested(['combate', 'iniciativa'], toNumber(event.target.value))}
              />
            </div>
            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Armadura Cabeca"
                value={sheet.combate.armadura.cabeca.tipo}
                onChange={(event) =>
                  updateNested(['combate', 'armadura', 'cabeca', 'tipo'], event.target.value)
                }
              />
              <input
                className="entry-input"
                type="number"
                placeholder="SP Cabeca"
                value={sheet.combate.armadura.cabeca.sp}
                onChange={(event) =>
                  updateNested(['combate', 'armadura', 'cabeca', 'sp'], toNumber(event.target.value))
                }
              />
              <input
                className="entry-input"
                type="number"
                placeholder="SP Atual Cabeca"
                value={sheet.combate.armadura.cabeca.spAtual}
                onChange={(event) =>
                  updateNested(['combate', 'armadura', 'cabeca', 'spAtual'], toNumber(event.target.value))
                }
              />
              <input
                className="entry-input"
                placeholder="Armadura Corpo"
                value={sheet.combate.armadura.corpo.tipo}
                onChange={(event) =>
                  updateNested(['combate', 'armadura', 'corpo', 'tipo'], event.target.value)
                }
              />
              <input
                className="entry-input"
                type="number"
                placeholder="SP Corpo"
                value={sheet.combate.armadura.corpo.sp}
                onChange={(event) =>
                  updateNested(['combate', 'armadura', 'corpo', 'sp'], toNumber(event.target.value))
                }
              />
              <input
                className="entry-input"
                type="number"
                placeholder="SP Atual Corpo"
                value={sheet.combate.armadura.corpo.spAtual}
                onChange={(event) =>
                  updateNested(['combate', 'armadura', 'corpo', 'spAtual'], toNumber(event.target.value))
                }
              />
            </div>

            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Arma: nome"
                value={newWeapon.nome}
                onChange={(event) => setNewWeapon((prev) => ({ ...prev, nome: event.target.value }))}
              />
              <input
                className="entry-input"
                placeholder="Tipo"
                value={newWeapon.tipo}
                onChange={(event) => setNewWeapon((prev) => ({ ...prev, tipo: event.target.value }))}
              />
              <input
                className="entry-input"
                placeholder="Dano"
                value={newWeapon.dano}
                onChange={(event) => setNewWeapon((prev) => ({ ...prev, dano: event.target.value }))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Municao"
                value={newWeapon.municao}
                onChange={(event) => setNewWeapon((prev) => ({ ...prev, municao: event.target.value }))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Municao Max"
                value={newWeapon.municaoMax}
                onChange={(event) => setNewWeapon((prev) => ({ ...prev, municaoMax: event.target.value }))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="CDT"
                value={newWeapon.cdt}
                onChange={(event) => setNewWeapon((prev) => ({ ...prev, cdt: event.target.value }))}
              />
              <input
                className="entry-input"
                placeholder="Habilidade"
                value={newWeapon.habilidade}
                onChange={(event) => setNewWeapon((prev) => ({ ...prev, habilidade: event.target.value }))}
              />
              <input
                className="entry-input"
                placeholder="Qualidade"
                value={newWeapon.qualidade}
                onChange={(event) => setNewWeapon((prev) => ({ ...prev, qualidade: event.target.value }))}
              />
              <button className="mission-add-btn" onClick={handleAddWeapon}>ADICIONAR ARMA</button>
            </div>

            {sheet.combate.armas.length ? (
              <div className="entries-list">
                {sheet.combate.armas.map((arma, index) => (
                  <div key={`${arma.nome}-${index}`} className="entry-card">
                    <div className="entry-card-title">{arma.nome || 'Arma'}</div>
                    <div className="entry-form compact">
                      <input
                        className="entry-input"
                        placeholder="Tipo"
                        value={arma.tipo || ''}
                        onChange={(event) => handleUpdateWeapon(index, 'tipo', event.target.value)}
                      />
                      <input
                        className="entry-input"
                        placeholder="Dano"
                        value={arma.dano || ''}
                        onChange={(event) => handleUpdateWeapon(index, 'dano', event.target.value)}
                      />
                      <input
                        className="entry-input"
                        type="number"
                        placeholder="Municao"
                        value={arma.municao ?? ''}
                        onChange={(event) =>
                          handleUpdateWeapon(index, 'municao', toNumber(event.target.value))
                        }
                      />
                      <input
                        className="entry-input"
                        type="number"
                        placeholder="Municao Max"
                        value={arma.municaoMax ?? ''}
                        onChange={(event) =>
                          handleUpdateWeapon(index, 'municaoMax', toNumber(event.target.value))
                        }
                      />
                      <input
                        className="entry-input"
                        type="number"
                        placeholder="CDT"
                        value={arma.cdt ?? ''}
                        onChange={(event) =>
                          handleUpdateWeapon(index, 'cdt', toNumber(event.target.value))
                        }
                      />
                      <input
                        className="entry-input"
                        placeholder="Habilidade"
                        value={arma.habilidade || ''}
                        onChange={(event) => handleUpdateWeapon(index, 'habilidade', event.target.value)}
                      />
                      <input
                        className="entry-input"
                        placeholder="Qualidade"
                        value={arma.qualidade || ''}
                        onChange={(event) => handleUpdateWeapon(index, 'qualidade', event.target.value)}
                      />
                      <button className="mission-delete-btn" onClick={() => handleRemoveWeapon(index)}>
                        EXCLUIR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="placeholder-box">Nenhuma arma cadastrada.</div>
            )}
          </div>
        </details>
      );
    }

    if (section.id === 'cyberware') {
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <label className="entry-input">
                <input
                  type="checkbox"
                  checked={Boolean(sheet.cyberware.neuralware.linkNeural.instalado)}
                  onChange={(event) =>
                    updateNested(['cyberware', 'neuralware', 'linkNeural', 'instalado'], event.target.checked)
                  }
                />{' '}
                Link Neural instalado
              </label>
              <input
                className="entry-input"
                type="number"
                placeholder="Slots Link Neural"
                value={sheet.cyberware.neuralware.linkNeural.slots}
                onChange={(event) =>
                  updateNested(['cyberware', 'neuralware', 'linkNeural', 'slots'], toNumber(event.target.value))
                }
              />
            </div>

            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Opcao neuralware"
                value={newCyberOption.nome}
                onChange={(event) => setNewCyberOption((prev) => ({ ...prev, nome: event.target.value }))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Slot"
                value={newCyberOption.slot}
                onChange={(event) => setNewCyberOption((prev) => ({ ...prev, slot: event.target.value }))}
              />
              <button className="mission-add-btn" onClick={handleAddCyberOption}>ADICIONAR OPCAO</button>
            </div>

            {sheet.cyberware.neuralware.opcoes.length ? (
              <div className="entries-list">
                {sheet.cyberware.neuralware.opcoes.map((opt, index) => (
                  <div key={`${opt.nome}-${index}`} className="entry-card">
                    <div className="entry-card-title">{opt.nome}</div>
                    <div className="entry-card-text">Slot: {opt.slot}</div>
                    <button className="mission-delete-btn" onClick={() => handleRemoveCyberOption(index)}>
                      EXCLUIR
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="placeholder-box">Sem opcoes neuralware.</div>
            )}

            <div className="entry-form compact">
              <input
                className="entry-input"
                type="number"
                placeholder="Slots olho esquerdo"
                value={sheet.cyberware.cyberopticos.olhoEsquerdo.slots}
                onChange={(event) =>
                  updateNested(
                    ['cyberware', 'cyberopticos', 'olhoEsquerdo', 'slots'],
                    toNumber(event.target.value)
                  )
                }
              />
              <input
                className="entry-input"
                placeholder="Opcao olho esquerdo"
                value={newLeftOptic}
                onChange={(event) => setNewLeftOptic(event.target.value)}
              />
              <button className="mission-add-btn" onClick={() => handleAddOptic('left')}>
                ADICIONAR
              </button>
            </div>
            {sheet.cyberware.cyberopticos.olhoEsquerdo.opcoes.length ? (
              <div className="entries-list">
                {sheet.cyberware.cyberopticos.olhoEsquerdo.opcoes.map((opt, index) => (
                  <div key={`${opt}-${index}`} className="entry-card">
                    <div className="entry-card-title">{opt}</div>
                    <button className="mission-delete-btn" onClick={() => handleRemoveOptic('left', index)}>
                      EXCLUIR
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="entry-form compact">
              <input
                className="entry-input"
                type="number"
                placeholder="Slots olho direito"
                value={sheet.cyberware.cyberopticos.olhoDireito.slots}
                onChange={(event) =>
                  updateNested(
                    ['cyberware', 'cyberopticos', 'olhoDireito', 'slots'],
                    toNumber(event.target.value)
                  )
                }
              />
              <input
                className="entry-input"
                placeholder="Opcao olho direito"
                value={newRightOptic}
                onChange={(event) => setNewRightOptic(event.target.value)}
              />
              <button className="mission-add-btn" onClick={() => handleAddOptic('right')}>
                ADICIONAR
              </button>
            </div>
            {sheet.cyberware.cyberopticos.olhoDireito.opcoes.length ? (
              <div className="entries-list">
                {sheet.cyberware.cyberopticos.olhoDireito.opcoes.map((opt, index) => (
                  <div key={`${opt}-${index}`} className="entry-card">
                    <div className="entry-card-title">{opt}</div>
                    <button className="mission-delete-btn" onClick={() => handleRemoveOptic('right', index)}>
                      EXCLUIR
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </details>
      );
    }

    if (section.id === 'estiloVida') {
      const lifestyleCostLabel = lifestyleOption ? formatMonthlyCost(lifestyleCost, false) : '---';
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="life-block">
              <div className="life-block-header">
                <div className="life-block-title">Estilo de Vida</div>
                <div className="life-block-subtitle">Defina o nivel de conforto mensal.</div>
              </div>
              <div className="life-select-row">
                <label className="life-label">Selecione o estilo</label>
                <select
                  className="entry-input"
                  value={lifestyleSelectValue}
                  onChange={(event) => handleLifestyleSelect(event.target.value)}
                >
                  <option value="">Selecione...</option>
                  {LIFESTYLE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} - E$ {option.cost}/mes
                    </option>
                  ))}
                </select>
              </div>
              <div className="life-summary">
                <div className="life-summary-card">
                  <div className="life-summary-label">Custo mensal</div>
                  <div className="life-summary-value">{lifestyleCostLabel}</div>
                </div>
                <div className="life-summary-card">
                  <div className="life-summary-label">Total atual</div>
                  <div className="life-summary-value">E$ {totalMonthlyCost}/mes</div>
                </div>
              </div>
              {isExecRole ? (
                <div className="life-note">Exec comeca com Good Prepak (E$ 600/mes).</div>
              ) : (
                <div className="life-note">Padrao inicial: Kibble (E$ 100/mes).</div>
              )}
              <div className="entry-form compact">
                <input
                  className="entry-input"
                  placeholder="Pago ate"
                  value={sheet.estiloVida.pagoAte}
                  onChange={(event) => updateSection('estiloVida', 'pagoAte', event.target.value)}
                />
              </div>
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'moradia') {
      const housingCostLabel = housingOption ? formatMonthlyCost(housingCost, housingOption.cost == null) : '---';
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="life-block">
              <div className="life-block-header">
                <div className="life-block-title">Moradia</div>
                <div className="life-block-subtitle">Escolha onde voce mora e o custo mensal.</div>
              </div>
              <div className="life-select-row">
                <label className="life-label">Tipo de moradia</label>
                <select
                  className="entry-input"
                  value={housingSelectValue}
                  onChange={(event) => handleHousingSelect(event.target.value)}
                >
                  <option value="">Selecione...</option>
                  {HOUSING_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                      {option.cost != null ? ` - E$ ${option.cost}/mes` : ' - Compra'}
                    </option>
                  ))}
                </select>
              </div>
              {housingOption?.note ? <div className="life-note">{housingOption.note}</div> : null}
              {isNomadRole ? (
                <div className="life-note">Nomade: pode usar Veiculo da Familia (sem aluguel).</div>
              ) : null}
              <div className="life-note">
                Primeiro mes gratis para a moradia padrao. Se escolher outra, o custo mensal pode ser aplicado.
              </div>
              <div className="life-summary">
                <div className="life-summary-card">
                  <div className="life-summary-label">Moradia</div>
                  <div className="life-summary-value">{housingCostLabel}</div>
                </div>
                <div className="life-summary-card">
                  <div className="life-summary-label">Total mensal</div>
                  <div className="life-summary-value">E$ {totalMonthlyCost}/mes</div>
                </div>
              </div>
              <div className="entry-form compact">
                <input
                  className="entry-input"
                  placeholder="Localizacao"
                  value={sheet.moradia.localizacao}
                  onChange={(event) => updateSection('moradia', 'localizacao', event.target.value)}
                />
                <input
                  className="entry-input"
                  placeholder="Pago ate"
                  value={sheet.moradia.pagoAte}
                  onChange={(event) => updateSection('moradia', 'pagoAte', event.target.value)}
                />
              </div>
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'lifepath') {
      const selectedOrigin =
        LIFEPATH_ORIGENS.find((origin) => origin.regiao === sheet.lifepath.origemCultural) || null;
      const availableLanguages =
        selectedOrigin?.linguas || sheet.lifepath.linguasDisponiveis || [];
      const friends = sheet.lifepath.amigos || [];
      const enemies = sheet.lifepath.inimigos || [];
      const loves = sheet.lifepath.amoresTragicos || [];
      const roleSpecificTables = selectedRole?.lifepathEspecifico || null;
      const lifepathTabs = [
        { id: 'origens', label: 'Origens e Personalidade' },
        { id: 'background', label: 'Background e Ambiente' },
        { id: 'relacoes', label: 'Relacoes e Eventos' },
        { id: 'especifico', label: 'Lifepath do Papel' },
      ];
      const formatRoleTableLabel = (key) =>
        String(key)
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (char) => char.toUpperCase());
      const getRoleOptionLabel = (entry) => {
        if (typeof entry === 'string') return entry;
        if (!entry) return '';
        return entry.tipo || entry.descricao || entry.nome || entry.label || String(entry);
      };
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="lifepath-tabs">
              {lifepathTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`lifepath-tab ${lifepathTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setLifepathTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="lifepath-panel">
              {lifepathTab === 'origens' ? (
                <div className="lifepath-block">
                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Origem Cultural</div>
                    <button className="mission-add-btn" type="button" onClick={handleOriginRoll}>
                      ROLAR 1D10
                    </button>
                  </div>
                  <div className="lifepath-grid">
                    <div className="lifepath-row">
                      <label className="entry-label">Regiao</label>
                      <select
                        className="entry-input"
                        value={sheet.lifepath.origemCultural}
                        onChange={(event) =>
                          handleOriginSelect(
                            LIFEPATH_ORIGENS.find((origin) => origin.regiao === event.target.value) || null,
                          )
                        }
                      >
                        <option value="">Selecione a origem</option>
                        {LIFEPATH_ORIGENS.map((origin) => (
                          <option key={origin.regiao} value={origin.regiao}>
                            {origin.regiao}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="lifepath-row">
                      <label className="entry-label">Idioma nativo</label>
                      <select
                        className="entry-input"
                        value={sheet.lifepath.linguaNativa}
                        onChange={(event) => handleNativeLanguageSelect(event.target.value)}
                        disabled={!availableLanguages.length}
                      >
                        <option value="">Selecione um idioma</option>
                        {availableLanguages.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="lifepath-list">
                    <span>Idiomas disponiveis:</span>
                    {availableLanguages.length ? (
                      <div className="lifepath-tags">
                        {availableLanguages.map((lang) => (
                          <span key={lang} className="lifepath-tag">
                            {lang}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="lifepath-muted">Selecione uma origem para ver os idiomas.</span>
                    )}
                  </div>

                  <div className="lifepath-divider" />

                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Personalidade</div>
                    <button
                      className="mission-add-btn"
                      type="button"
                      onClick={() =>
                        updateLifepath('personalidade', rollFromList(LIFEPATH_PERSONALIDADE).value)
                      }
                    >
                      ROLAR 1D10
                    </button>
                  </div>
                  <select
                    className="entry-input"
                    value={sheet.lifepath.personalidade}
                    onChange={(event) => updateLifepath('personalidade', event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {LIFEPATH_PERSONALIDADE.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <div className="lifepath-divider" />

                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Roupas e Estilo</div>
                  </div>
                  <div className="lifepath-grid">
                    <div className="lifepath-row">
                      <label className="entry-label">Estilo de roupa</label>
                      <div className="lifepath-inline">
                        <select
                          className="entry-input"
                          value={sheet.lifepath.estiloRoupa}
                          onChange={(event) => updateLifepath('estiloRoupa', event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {LIFEPATH_ROUPA.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <button
                          className="mission-add-btn"
                          type="button"
                          onClick={() => updateLifepath('estiloRoupa', rollFromList(LIFEPATH_ROUPA).value)}
                        >
                          ROLAR
                        </button>
                      </div>
                    </div>
                    <div className="lifepath-row">
                      <label className="entry-label">Penteado</label>
                      <div className="lifepath-inline">
                        <select
                          className="entry-input"
                          value={sheet.lifepath.penteado}
                          onChange={(event) => updateLifepath('penteado', event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {LIFEPATH_PENTEADO.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <button
                          className="mission-add-btn"
                          type="button"
                          onClick={() => updateLifepath('penteado', rollFromList(LIFEPATH_PENTEADO).value)}
                        >
                          ROLAR
                        </button>
                      </div>
                    </div>
                    <div className="lifepath-row">
                      <label className="entry-label">Adorno</label>
                      <div className="lifepath-inline">
                        <select
                          className="entry-input"
                          value={sheet.lifepath.adorno}
                          onChange={(event) => updateLifepath('adorno', event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {LIFEPATH_ADORNO.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <button
                          className="mission-add-btn"
                          type="button"
                          onClick={() => updateLifepath('adorno', rollFromList(LIFEPATH_ADORNO).value)}
                        >
                          ROLAR
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lifepath-divider" />

                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Motivacoes e Relacionamentos</div>
                  </div>
                  <div className="lifepath-grid">
                    <div className="lifepath-row">
                      <label className="entry-label">O que voce valoriza mais?</label>
                      <div className="lifepath-inline">
                        <select
                          className="entry-input"
                          value={sheet.lifepath.valorMaisImportante}
                          onChange={(event) => updateLifepath('valorMaisImportante', event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {LIFEPATH_VALOR.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <button
                          className="mission-add-btn"
                          type="button"
                          onClick={() =>
                            updateLifepath('valorMaisImportante', rollFromList(LIFEPATH_VALOR).value)
                          }
                        >
                          ROLAR
                        </button>
                      </div>
                    </div>
                    <div className="lifepath-row">
                      <label className="entry-label">Como se sente sobre as pessoas?</label>
                      <div className="lifepath-inline">
                        <select
                          className="entry-input"
                          value={sheet.lifepath.sentimentoPessoas}
                          onChange={(event) => updateLifepath('sentimentoPessoas', event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {LIFEPATH_SENTIMENTO.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <button
                          className="mission-add-btn"
                          type="button"
                          onClick={() =>
                            updateLifepath('sentimentoPessoas', rollFromList(LIFEPATH_SENTIMENTO).value)
                          }
                        >
                          ROLAR
                        </button>
                      </div>
                    </div>
                    <div className="lifepath-row">
                      <label className="entry-label">Pessoa mais importante da sua vida</label>
                      <div className="lifepath-inline">
                        <select
                          className="entry-input"
                          value={sheet.lifepath.pessoaMaisImportante}
                          onChange={(event) => updateLifepath('pessoaMaisImportante', event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {LIFEPATH_PESSOA_IMPORTANTE.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <button
                          className="mission-add-btn"
                          type="button"
                          onClick={() =>
                            updateLifepath(
                              'pessoaMaisImportante',
                              rollFromList(LIFEPATH_PESSOA_IMPORTANTE).value,
                            )
                          }
                        >
                          ROLAR
                        </button>
                      </div>
                    </div>
                    <div className="lifepath-row">
                      <label className="entry-label">Posse mais valiosa</label>
                      <div className="lifepath-inline">
                        <select
                          className="entry-input"
                          value={sheet.lifepath.posseMaisValiosa}
                          onChange={(event) => updateLifepath('posseMaisValiosa', event.target.value)}
                        >
                          <option value="">Selecione</option>
                          {LIFEPATH_POSSE.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <button
                          className="mission-add-btn"
                          type="button"
                          onClick={() => updateLifepath('posseMaisValiosa', rollFromList(LIFEPATH_POSSE).value)}
                        >
                          ROLAR
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {lifepathTab === 'background' ? (
                <div className="lifepath-block">
                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Background Familiar</div>
                    <button
                      className="mission-add-btn"
                      type="button"
                      onClick={() =>
                        updateLifepath('backgroundFamiliar', rollFromList(LIFEPATH_BACKGROUND).value)
                      }
                    >
                      ROLAR 1D10
                    </button>
                  </div>
                  <select
                    className="entry-input"
                    value={sheet.lifepath.backgroundFamiliar}
                    onChange={(event) => updateLifepath('backgroundFamiliar', event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {LIFEPATH_BACKGROUND.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <div className="lifepath-divider" />

                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Ambiente da Infancia</div>
                    <button
                      className="mission-add-btn"
                      type="button"
                      onClick={() =>
                        updateLifepath('ambienteInfancia', rollFromList(LIFEPATH_AMBIENTE).value)
                      }
                    >
                      ROLAR 1D10
                    </button>
                  </div>
                  <select
                    className="entry-input"
                    value={sheet.lifepath.ambienteInfancia}
                    onChange={(event) => updateLifepath('ambienteInfancia', event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {LIFEPATH_AMBIENTE.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <div className="lifepath-divider" />

                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Crises Familiares</div>
                    <button
                      className="mission-add-btn"
                      type="button"
                      onClick={() => updateLifepath('criseFamiliar', rollFromList(LIFEPATH_CRISE).value)}
                    >
                      ROLAR 1D10
                    </button>
                  </div>
                  <select
                    className="entry-input"
                    value={sheet.lifepath.criseFamiliar}
                    onChange={(event) => updateLifepath('criseFamiliar', event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {LIFEPATH_CRISE.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {lifepathTab === 'relacoes' ? (
                <div className="lifepath-block">
                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Amigos</div>
                    <button className="mission-add-btn" type="button" onClick={handleRollFriendsCount}>
                      ROLAR NUMERO
                    </button>
                  </div>
                  <div className="lifepath-list">
                    <span>Total: {friends.length}</span>
                  </div>
                  {friends.length ? (
                    <div className="lifepath-stack">
                      {friends.map((friend, index) => (
                        <div key={`friend-${index}`} className="lifepath-row">
                          <label className="entry-label">Amigo #{index + 1}</label>
                          <div className="lifepath-inline">
                            <select
                              className="entry-input"
                              value={friend.relacao || ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setSheet((prev) => {
                                  const next = cloneValue(prev);
                                  const list = [...(next.lifepath.amigos || [])];
                                  list[index] = { ...(list[index] || {}), relacao: value };
                                  next.lifepath.amigos = list;
                                  return next;
                                });
                              }}
                            >
                              <option value="">Selecione</option>
                              {LIFEPATH_RELACAO_AMIGOS.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                            <button
                              className="mission-add-btn"
                              type="button"
                              onClick={() => handleFriendRelationRoll(index)}
                            >
                              ROLAR
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="lifepath-muted">Role para gerar amigos.</div>
                  )}

                  <div className="lifepath-divider" />

                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Inimigos</div>
                    <button className="mission-add-btn" type="button" onClick={handleRollEnemiesCount}>
                      ROLAR NUMERO
                    </button>
                  </div>
                  <div className="lifepath-list">
                    <span>Total: {enemies.length}</span>
                  </div>
                  {enemies.length ? (
                    <div className="lifepath-stack">
                      {enemies.map((enemy, index) => (
                        <div key={`enemy-${index}`} className="lifepath-enemy-card">
                          <div className="lifepath-enemy-title">Inimigo #{index + 1}</div>
                          <div className="lifepath-grid">
                            <div className="lifepath-row">
                              <label className="entry-label">Quem</label>
                              <div className="lifepath-inline">
                                <select
                                  className="entry-input"
                                  value={enemy.quem || ''}
                                  onChange={(event) => handleEnemyFieldUpdate(index, 'quem', event.target.value)}
                                >
                                  <option value="">Selecione</option>
                                  {LIFEPATH_INIMIGO_QUEM.map((item) => (
                                    <option key={item} value={item}>
                                      {item}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="mission-add-btn"
                                  type="button"
                                  onClick={() => handleEnemyRoll(index, 'quem', LIFEPATH_INIMIGO_QUEM)}
                                >
                                  ROLAR
                                </button>
                              </div>
                            </div>
                            <div className="lifepath-row">
                              <label className="entry-label">O que causou isso?</label>
                              <div className="lifepath-inline">
                                <select
                                  className="entry-input"
                                  value={enemy.causa || ''}
                                  onChange={(event) => handleEnemyFieldUpdate(index, 'causa', event.target.value)}
                                >
                                  <option value="">Selecione</option>
                                  {LIFEPATH_INIMIGO_CAUSA.map((item) => (
                                    <option key={item} value={item}>
                                      {item}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="mission-add-btn"
                                  type="button"
                                  onClick={() => handleEnemyRoll(index, 'causa', LIFEPATH_INIMIGO_CAUSA)}
                                >
                                  ROLAR
                                </button>
                              </div>
                            </div>
                            <div className="lifepath-row">
                              <label className="entry-label">Quem foi injusticado</label>
                              <select
                                className="entry-input"
                                value={enemy.injusticado || ''}
                                onChange={(event) => handleEnemyFieldUpdate(index, 'injusticado', event.target.value)}
                              >
                                <option value="">Selecione</option>
                                {LIFEPATH_INJUSTICADO.map((item) => (
                                  <option key={item} value={item}>
                                    {item}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="lifepath-row">
                              <label className="entry-label">O que podem usar contra voce</label>
                              <div className="lifepath-inline">
                                <select
                                  className="entry-input"
                                  value={enemy.poder || ''}
                                  onChange={(event) => handleEnemyFieldUpdate(index, 'poder', event.target.value)}
                                >
                                  <option value="">Selecione</option>
                                  {LIFEPATH_INIMIGO_PODER.map((item) => (
                                    <option key={item} value={item}>
                                      {item}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="mission-add-btn"
                                  type="button"
                                  onClick={() => handleEnemyRoll(index, 'poder', LIFEPATH_INIMIGO_PODER)}
                                >
                                  ROLAR
                                </button>
                              </div>
                            </div>
                            <div className="lifepath-row">
                              <label className="entry-label">Doce vinganca</label>
                              <div className="lifepath-inline">
                                <select
                                  className="entry-input"
                                  value={enemy.vinganca || ''}
                                  onChange={(event) => handleEnemyFieldUpdate(index, 'vinganca', event.target.value)}
                                >
                                  <option value="">Selecione</option>
                                  {LIFEPATH_VINGANCA.map((item) => (
                                    <option key={item} value={item}>
                                      {item}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="mission-add-btn"
                                  type="button"
                                  onClick={() => handleEnemyRoll(index, 'vinganca', LIFEPATH_VINGANCA)}
                                >
                                  ROLAR
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="lifepath-muted">Role para gerar inimigos.</div>
                  )}

                  <div className="lifepath-divider" />

                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Casos de Amor Tragicos</div>
                    <button className="mission-add-btn" type="button" onClick={handleRollLoveCount}>
                      ROLAR NUMERO
                    </button>
                  </div>
                  <div className="lifepath-list">
                    <span>Total: {loves.length}</span>
                  </div>
                  {loves.length ? (
                    <div className="lifepath-stack">
                      {loves.map((love, index) => (
                        <div key={`love-${index}`} className="lifepath-row">
                          <label className="entry-label">Caso #{index + 1}</label>
                          <div className="lifepath-inline">
                            <select
                              className="entry-input"
                              value={love.fim || ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setSheet((prev) => {
                                  const next = cloneValue(prev);
                                  const list = [...(next.lifepath.amoresTragicos || [])];
                                  list[index] = { ...(list[index] || {}), fim: value };
                                  next.lifepath.amoresTragicos = list;
                                  return next;
                                });
                              }}
                            >
                              <option value="">Selecione</option>
                              {LIFEPATH_AMOR.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                            <button
                              className="mission-add-btn"
                              type="button"
                              onClick={() => handleLoveRoll(index)}
                            >
                              ROLAR
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="lifepath-muted">Role para gerar casos.</div>
                  )}

                  <div className="lifepath-divider" />

                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Metas na Vida</div>
                    <button
                      className="mission-add-btn"
                      type="button"
                      onClick={() => updateLifepath('metaVida', rollFromList(LIFEPATH_META).value)}
                    >
                      ROLAR 1D10
                    </button>
                  </div>
                  <select
                    className="entry-input"
                    value={sheet.lifepath.metaVida}
                    onChange={(event) => updateLifepath('metaVida', event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {LIFEPATH_META.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {lifepathTab === 'especifico' ? (
                <div className="lifepath-block">
                  <div className="lifepath-block-header">
                    <div className="lifepath-block-title">Lifepath Especifico</div>
                  </div>
                  {roleSpecificTables ? (
                    <div className="lifepath-stack">
                      {Object.entries(roleSpecificTables).map(([key, table]) => {
                        const options = Array.isArray(table) ? table : [];
                        const selectedValue = sheet.lifepath.especifico?.[key] || '';
                        return (
                          <div key={key} className="lifepath-row">
                            <label className="entry-label">{formatRoleTableLabel(key)}</label>
                            <div className="lifepath-inline">
                              <select
                                className="entry-input"
                                value={selectedValue}
                                onChange={(event) => handleRoleSpecificUpdate(key, event.target.value)}
                              >
                                <option value="">Selecione</option>
                                {options.map((option) => {
                                  const label = getRoleOptionLabel(option);
                                  return (
                                    <option key={label} value={label}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                className="mission-add-btn"
                                type="button"
                                onClick={() => {
                                  const { value } = rollFromList(options);
                                  handleRoleSpecificUpdate(key, getRoleOptionLabel(value));
                                }}
                              >
                                ROLAR
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="lifepath-muted">Selecione um papel para ver as tabelas especificas.</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'progressao') {
      const ipAtualValue = Number(sheet.progressao.ipAtual);
      const ipGastoValue = Number(sheet.progressao.ipGasto);
      const ipTotalValue = Number(sheet.progressao.ipTotal);
      const ipAtualNum = Number.isFinite(ipAtualValue) ? ipAtualValue : null;
      const ipGastoNum = Number.isFinite(ipGastoValue) ? ipGastoValue : null;
      const ipTotalNum = Number.isFinite(ipTotalValue) ? ipTotalValue : null;
      const ipCalculatedTotal =
        ipAtualNum != null && ipGastoNum != null ? ipAtualNum + ipGastoNum : null;
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="life-block">
              <div className="life-block-header">
                <div className="life-block-title">Progressao</div>
                <div className="life-block-subtitle">Controle de IP acumulado e gasto.</div>
              </div>
              <div className="entry-form compact">
                <input
                  className="entry-input"
                  type="number"
                  placeholder="IP Atual"
                  value={sheet.progressao.ipAtual}
                  onChange={(event) => updateSection('progressao', 'ipAtual', toNumber(event.target.value))}
                />
                <input
                  className="entry-input"
                  type="number"
                  placeholder="IP Gasto"
                  value={sheet.progressao.ipGasto}
                  onChange={(event) => updateSection('progressao', 'ipGasto', toNumber(event.target.value))}
                />
                <input
                  className="entry-input"
                  type="number"
                  placeholder="IP Total"
                  value={sheet.progressao.ipTotal}
                  onChange={(event) => updateSection('progressao', 'ipTotal', toNumber(event.target.value))}
                />
              </div>
              <div className="life-summary">
                <div className="life-summary-card">
                  <div className="life-summary-label">Atual</div>
                  <div className="life-summary-value">{ipAtualNum ?? '---'}</div>
                </div>
                <div className="life-summary-card">
                  <div className="life-summary-label">Gasto</div>
                  <div className="life-summary-value">{ipGastoNum ?? '---'}</div>
                </div>
                <div className="life-summary-card">
                  <div className="life-summary-label">Total</div>
                  <div className="life-summary-value">
                    {ipTotalNum ?? (ipCalculatedTotal != null ? `${ipCalculatedTotal} (auto)` : '---')}
                  </div>
                </div>
              </div>
              <div className="life-note">Sugestao: IP total = IP atual + IP gasto.</div>
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'reputacao') {
      const repValue = Number(sheet.reputacao.nivel);
      const repLevel = Number.isFinite(repValue) ? repValue : null;
      const repInfo = repLevel
        ? REPUTATION_LEVELS.find((entry) => entry.level === repLevel) || null
        : null;
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="life-block">
              <div className="life-block-header">
                <div className="life-block-title">Reputacao</div>
                <div className="life-block-subtitle">O quao conhecido voce e no Tempo do Vermelho.</div>
              </div>
              <div className="entry-form compact">
                <input
                  className="entry-input"
                  type="number"
                  placeholder="Nivel"
                  value={sheet.reputacao.nivel}
                  onChange={(event) => updateSection('reputacao', 'nivel', toNumber(event.target.value))}
                />
              </div>
              <div className="life-summary">
                <div className="life-summary-card">
                  <div className="life-summary-label">Impacto</div>
                  <div className="life-summary-value">{repInfo?.desc || '---'}</div>
                </div>
                <div className="life-summary-card">
                  <div className="life-summary-label">Nivel atual</div>
                  <div className="life-summary-value">{repLevel ?? '---'}</div>
                </div>
              </div>
              <div className="life-note">Facedown: COOL + Reputacao + 1d10 (perdedor sofre -2).</div>
            </div>
            <div className="life-block">
              <div className="life-block-header">
                <div className="life-block-title">Eventos de reputacao</div>
                <div className="life-block-subtitle">Registre feitos que aumentaram sua fama.</div>
              </div>
              <div className="entry-form compact">
                <input
                  className="entry-input"
                  placeholder="Descricao do evento"
                  value={newReputationEvent.descricao}
                  onChange={(event) =>
                    setNewReputationEvent((prev) => ({ ...prev, descricao: event.target.value }))
                  }
                />
                <input
                  className="entry-input"
                  type="number"
                  placeholder="Nivel"
                  value={newReputationEvent.nivel}
                  onChange={(event) =>
                    setNewReputationEvent((prev) => ({ ...prev, nivel: event.target.value }))
                  }
                />
                <button className="mission-add-btn" onClick={handleAddReputationEvent}>
                  ADICIONAR EVENTO
                </button>
              </div>
              {sheet.reputacao.eventos.length ? (
                <div className="entries-list">
                  {sheet.reputacao.eventos.map((event, index) => (
                    <div key={`${event.descricao}-${index}`} className="entry-card">
                      <div className="entry-card-title">{event.descricao}</div>
                      <div className="entry-card-text">Nivel: {event.nivel}</div>
                      <button className="mission-delete-btn" onClick={() => handleRemoveReputationEvent(index)}>
                        EXCLUIR
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'equipamento') {
      const roleEquipment = selectedRole?.equipamentoInicial ?? null;
      const initialItems = Array.isArray(roleEquipment?.armasEArmadura) ? roleEquipment.armasEArmadura : [];
      const initialPrograms = Array.isArray(roleEquipment?.programasCyberdeck) ? roleEquipment.programasCyberdeck : [];
      const showInitial = creationMethod !== 'pacote_completo';
      const canShop = gearBudgets.general > 0 || gearBudgets.fashion > 0;
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="gear-block">
              <div className="gear-block-header">
                <div className="gear-block-title">Equipamento inicial</div>
                <div className="gear-block-subtitle">
                  {showInitial ? 'Ratos de Rua / Edgerunners' : 'Pacote Completo escolhe tudo na loja'}
                </div>
              </div>
              {showInitial ? (
                initialItems.length || initialPrograms.length ? (
                  <div className="gear-list">
                    {initialItems.map((entry) => (
                      <div className="gear-list-row" key={`${entry.item}-${entry.quantidade ?? entry.sp ?? ''}`}>
                        <span className="gear-list-name">{entry.item}</span>
                        <span className="gear-list-meta">
                          {entry.quantidade != null ? `x${entry.quantidade}` : ''}
                          {entry.sp != null ? `SP ${entry.sp}` : ''}
                        </span>
                      </div>
                    ))}
                    {initialPrograms.length ? (
                      <div className="gear-list-group">
                        <div className="gear-list-label">Programas de Cyberdeck</div>
                        {initialPrograms.map((entry) => (
                          <div className="gear-list-row" key={`programa-${entry.nome}`}>
                            <span className="gear-list-name">{entry.nome}</span>
                            <span className="gear-list-meta">x{entry.quantidade}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {roleEquipment?.moda?.estilos?.length ? (
                      <div className="gear-list-group">
                        <div className="gear-list-label">Moda sugerida</div>
                        <div className="gear-tag-row">
                          {roleEquipment.moda.estilos.map((item) => (
                            <span key={item} className="entry-tag">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {roleEquipment?.moda?.adornos?.length ? (
                      <div className="gear-list-group">
                        <div className="gear-list-label">Adornos</div>
                        <div className="gear-tag-row">
                          {roleEquipment.moda.adornos.map((item) => (
                            <span key={item} className="entry-tag">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="gear-muted">Selecione um papel para ver o kit inicial.</div>
                )
              ) : (
                <div className="gear-muted">No pacote completo voce monta todo o kit no mercado abaixo.</div>
              )}
              <div className="gear-actions">
                <button
                  className="mission-action-btn edit"
                  type="button"
                  onClick={() =>
                    handleApplyInitialEquipment({ force: Boolean(sheet.criacao?.equipamentoInicialAplicado) })
                  }
                  disabled={!showInitial || !selectedRole}
                >
                  {sheet.criacao?.equipamentoInicialAplicado ? 'REAPLICAR KIT' : 'APLICAR AO INVENTARIO'}
                </button>
                {sheet.criacao?.equipamentoInicialAplicado ? (
                  <button
                    className="mission-action-btn delete"
                    type="button"
                    onClick={handleResetInitialEquipment}
                  >
                    LIBERAR KIT
                  </button>
                ) : null}
              </div>
            </div>

            <div className="gear-block">
              <div className="gear-block-header">
                <div className="gear-block-title">Mercado Noturno</div>
                <div className="gear-block-subtitle">Escolha itens do catalogo e envie ao inventario.</div>
              </div>
              <div className="gear-budget-row">
                <div className="gear-budget-card">
                  <div className="gear-budget-label">Saldo geral</div>
                  <div className={`gear-budget-value ${gearRemainingGeneral < 0 ? 'is-negative' : ''}`}>
                    E$ {gearRemainingGeneral}
                  </div>
                </div>
                {gearBudgets.fashion > 0 ? (
                  <div className="gear-budget-card">
                    <div className="gear-budget-label">Saldo moda</div>
                    <div className={`gear-budget-value ${gearRemainingFashion < 0 ? 'is-negative' : ''}`}>
                      E$ {gearRemainingFashion}
                    </div>
                  </div>
                ) : null}
                <div className="gear-budget-card">
                  <div className="gear-budget-label">Metodo</div>
                  <div className="gear-budget-value">
                    {creationMethod ? creationMethod.replace(/_/g, ' ') : '---'}
                  </div>
                </div>
              </div>
              {!creationMethod ? (
                <div className="gear-muted">Selecione um metodo na etapa anterior para liberar o orcamento.</div>
              ) : null}

              <div className="gear-filter-row">
                <select
                  className="entry-input"
                  value={shopCategory}
                  onChange={(event) => setShopCategory(event.target.value)}
                >
                  {CATEGORY_FILTERS.filter((cat) => cat.id !== 'all' && cat.id !== 'services' && cat.id !== 'housing').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                  <option value="all">Todos</option>
                </select>
                <input
                  className="entry-input"
                  placeholder="Buscar item"
                  value={shopSearch}
                  onChange={(event) => setShopSearch(event.target.value)}
                />
              </div>

              <div className="gear-catalog-grid">
                {filteredShopItems.length ? (
                  filteredShopItems.map((item) => {
                    const categoryLabel = findLabel(CATEGORY_FILTERS, item.category);
                    const isFashion = item.category === 'fashion';
                    const remaining = isFashion ? gearRemainingFashion : gearRemainingGeneral;
                    const canBuy = canShop && remaining - (Number(item.priceEb) || 0) >= 0;
                    return (
                      <div key={item.id} className="gear-item-card">
                        <div className="gear-item-name">{item.name}</div>
                        <div className="gear-item-meta">
                          {categoryLabel} | E$ {item.priceEb}
                          {item.priceNote ? ` (${item.priceNote})` : ''}
                        </div>
                        {item.description ? <div className="gear-item-desc">{item.description}</div> : null}
                        <button
                          className="gear-item-btn"
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          disabled={!canBuy}
                        >
                          {canBuy ? 'ADICIONAR' : 'SEM SALDO'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="gear-muted">Nenhum item encontrado com esses filtros.</div>
                )}
              </div>
            </div>

            <div className="gear-block gear-cart">
              <div className="gear-block-header">
                <div className="gear-block-title">Itens comprados</div>
                <div className="gear-block-subtitle">Carrinho atual</div>
              </div>
              {gearCart.length ? (
                <div className="gear-cart-list">
                  {gearCart.map((entry) => (
                    <div key={entry.item.id} className="gear-cart-item">
                      <div className="gear-cart-main">
                        <div className="gear-cart-name">{entry.item.name}</div>
                        <div className="gear-cart-meta">
                          {findLabel(CATEGORY_FILTERS, entry.item.category)} | E$ {entry.item.priceEb} | Qtd {entry.quantity}
                        </div>
                      </div>
                      <div className="gear-cart-actions">
                        <button
                          className="gear-cart-btn"
                          type="button"
                          onClick={() => handleRemoveCartItem(entry)}
                        >
                          REMOVER
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gear-muted">Carrinho vazio.</div>
              )}
              <div className="gear-cart-footer">
                <button
                  className="mission-add-btn"
                  type="button"
                  onClick={handleCheckoutCart}
                  disabled={!gearCart.length}
                >
                  ENVIAR PARA INVENTARIO
                </button>
                <div className="gear-cart-totals">
                  <div>Gasto geral: E$ {gearSpent.general}</div>
                  {gearBudgets.fashion > 0 ? <div>Gasto moda: E$ {gearSpent.fashion}</div> : null}
                </div>
                {gearStatus ? <div className="gear-status">{gearStatus}</div> : null}
              </div>
            </div>

            <div className="gear-block gear-summary">
              <div className="gear-block-title">Inventario atual</div>
              <div className="gear-summary-row">
                Posses: {inventorySnapshot?.possessions?.length || 0}
              </div>
              <div className="gear-summary-row">
                Grid: {inventorySnapshot ? `${inventorySnapshot.gridCols}x${inventorySnapshot.gridRows}` : '---'}
              </div>
              <div className="gear-summary-row">
                Itens no grid: {inventorySnapshot?.items?.length || 0}
              </div>
            </div>
          </div>
        </details>
      );
    }

    return null;
  };

  const renderSummary = () => {
    const id = sheet.identificacao || {};
    const stats = sheet.estatisticas || {};
    const derived = sheet.derivadas || {};
    const life = sheet.lifepath || {};
    const skills = Object.entries(sheet.habilidades || {}).slice(0, 6);
    const items = (sheet.equipamento?.itens || []).slice(0, 4);

    return (
      <div className="wizard-summary">
        <div className="wizard-summary-header">
          <div className="wizard-summary-title">{id.nome || 'Sem nome'}</div>
          <div className="wizard-summary-tags">
            {id.handle ? <span className="wizard-summary-tag">{id.handle}</span> : null}
            {id.papel ? <span className="wizard-summary-tag">{id.papel}</span> : null}
            {id.rankHabilidadePapel ? (
              <span className="wizard-summary-tag">Rank {id.rankHabilidadePapel}</span>
            ) : null}
            {id.idade ? <span className="wizard-summary-tag">Idade {id.idade}</span> : null}
          </div>
        </div>

        <div className="wizard-summary-grid">
          <div className="wizard-summary-card">
            <div className="wizard-summary-card-title">Atributos</div>
            <div className="wizard-summary-stats">
              {STAT_KEYS.map((key) => (
                <div key={key} className="wizard-summary-stat">
                  <span>{key}</span>
                  <strong>{stats[key] || '-'}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="wizard-summary-card">
            <div className="wizard-summary-card-title">Derivadas</div>
            <div className="wizard-summary-list">
              <div>HP: {derived.hp || '-'} / {derived.hpMax || '-'}</div>
              <div>Humanidade: {derived.humanidade || '-'}</div>
              <div>Death Save: {derived.deathSave || '-'}</div>
              <div>Grave: {derived.seriouslyWounded || '-'}</div>
            </div>
          </div>

          <div className="wizard-summary-card">
            <div className="wizard-summary-card-title">Lifepath</div>
            <div className="wizard-summary-list">
              <div>Origem: {life.origemCultural || '-'}</div>
              <div>Personalidade: {life.personalidade || '-'}</div>
              <div>Estilo: {life.estiloRoupa || '-'}</div>
              <div>Meta: {life.metaVida || '-'}</div>
              <div>
                Amigos: {life.amigos?.length || 0} | Inimigos: {life.inimigos?.length || 0} | Amores: {life.amoresTragicos?.length || 0}
              </div>
            </div>
          </div>

          <div className="wizard-summary-card">
            <div className="wizard-summary-card-title">Habilidades (top)</div>
            <div className="wizard-summary-list">
              {skills.length ? (
                skills.map(([name, info]) => (
                  <div key={name}>
                    {name}: {info?.nivel ?? '-'}
                  </div>
                ))
              ) : (
                <div>Nenhuma habilidade registrada.</div>
              )}
            </div>
          </div>

          <div className="wizard-summary-card">
            <div className="wizard-summary-card-title">Equipamento</div>
            <div className="wizard-summary-list">
              <div>Dinheiro: {sheet.equipamento?.dinheiro || '-'}</div>
              {items.length ? (
                items.map((item, idx) => (
                  <div key={`${item.nome}-${idx}`}>
                    {item.nome} {item.quantidade ? `x${item.quantidade}` : ''}
                  </div>
                ))
              ) : (
                <div>Nenhum item listado.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMethodStep = () => (
    <div className="method-step">
      <div className="method-grid">
        <button
          type="button"
          className={`method-card ${creationMethod === 'ratos_de_rua' ? 'is-selected' : ''}`}
          onClick={() => handleMethodSelect('ratos_de_rua')}
        >
          <div className="method-card-title">Ratos de Rua (Modelos)</div>
          <div className="method-card-text">Rapido. Atributos e habilidades pre-definidos.</div>
        </button>
        <button
          type="button"
          className={`method-card ${creationMethod === 'edgerunner' ? 'is-selected' : ''}`}
          onClick={() => handleMethodSelect('edgerunner')}
        >
          <div className="method-card-title">Edgerunners (Rapido e Sujo)</div>
          <div className="method-card-text">Atributos rolados, habilidades com pontos.</div>
        </button>
        <button
          type="button"
          className={`method-card ${creationMethod === 'pacote_completo' ? 'is-selected' : ''}`}
          onClick={() => handleMethodSelect('pacote_completo')}
        >
          <div className="method-card-title">Pacote Completo (Calculado)</div>
          <div className="method-card-text">Personalizacao total com pontos e dinheiro.</div>
        </button>
      </div>
      <div className="method-footer">
        <span className="method-hint">
          {creationMethod ? 'Metodo selecionado.' : 'Escolha um metodo para continuar.'}
        </span>
        <button
          className="mission-action-btn edit"
          type="button"
          onClick={handleNextStep}
          disabled={!creationMethod}
        >
          INICIAR CRIACAO
        </button>
      </div>
    </div>
  );

  if (!campaignId || !playerId) {
    return (
      <div className="menu-shell">
        <div className="panel-header-row">
          <h2 className="menu-title">Ficha do Personagem</h2>
          <button className="menu-back" onClick={handleBack}>VOLTAR</button>
        </div>
        <div className="placeholder-box">Selecione um player para editar a ficha.</div>
      </div>
    );
  }

  return (
    <div className="menu-shell character-sheet-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">Ficha do Personagem</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="character-profile-hint">
        Fluxo guiado da ficha. Preencha passo a passo e veja o resumo final.
      </div>

      <div className="character-wizard">
        <div className="wizard-steps">
          {wizardSteps.map((step, index) => (
            <button
              key={step.id}
              className={`wizard-step ${index === activeStep ? 'is-active' : ''} ${index < activeStep ? 'is-done' : ''}`}
              onClick={() => handleStepChange(index)}
            >
              <span className="wizard-step-index">{index + 1}</span>
              <span className="wizard-step-text">
                <span className="wizard-step-label">{step.label}</span>
                <span className="wizard-step-hint">{step.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="wizard-panel" key={currentStep.id}>
          <div className="wizard-panel-header">
            <div className="wizard-panel-title">{currentStep.label}</div>
            <div className="wizard-panel-hint">{currentStep.hint}</div>
          </div>
          <div className="wizard-panel-body">
            {currentStep.id === 'metodo'
              ? renderMethodStep()
              : currentStep.id === 'resumo'
                ? renderSummary()
                : visibleSections.map(renderSection)}
          </div>
        </div>

        <div className="wizard-nav">
          <button
            className="mission-action-btn edit"
            onClick={handlePrevStep}
            disabled={activeStep === 0}
          >
            ANTERIOR
          </button>
          <div className="wizard-progress">
            Passo {activeStep + 1} de {totalSteps}
          </div>
          <button
            className="mission-action-btn edit"
            onClick={handleNextStep}
            disabled={activeStep === totalSteps - 1 || !canProceed}
          >
            PROXIMO
          </button>
        </div>
      </div>
    </div>
  );
}

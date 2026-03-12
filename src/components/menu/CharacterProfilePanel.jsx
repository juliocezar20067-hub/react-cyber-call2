import { useEffect, useMemo, useState } from 'react';
import { playSound } from '../../sound/soundSystem';
import { setStoredState, subscribeStoredState } from '../../lib/stateStorage';
import './Menu.css';

const SHEET_SCOPE = 'character_sheet_v2';

const STAT_KEYS = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP'];

const EMPTY_SHEET = {
  identificacao: {
    nome: '',
    handle: '',
    papel: '',
    rankHabilidadePapel: '',
    idade: '',
    foto: '',
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
    criseFamiliar: '',
    amigos: [],
    inimigos: [],
    amoresTragicos: [],
    metaVida: '',
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
];

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

  const [newCyberOption, setNewCyberOption] = useState({ nome: '', slot: '' });
  const [newLeftOptic, setNewLeftOptic] = useState('');
  const [newRightOptic, setNewRightOptic] = useState('');

  const [newLanguage, setNewLanguage] = useState('');
  const [newFriend, setNewFriend] = useState('');
  const [newEnemy, setNewEnemy] = useState({ quem: '', causa: '', poder: '', acao: '' });
  const [newLove, setNewLove] = useState('');

  const [newReputationEvent, setNewReputationEvent] = useState({ descricao: '', nivel: '' });

  const [newAmmo, setNewAmmo] = useState({ tipo: '', quantidade: '' });
  const [newGrenade, setNewGrenade] = useState({ tipo: '', quantidade: '' });
  const [newItem, setNewItem] = useState({ nome: '', quantidade: '' });

  const sections = useMemo(
    () => [
      { id: 'identificacao', label: 'Identificacao', open: true },
      { id: 'papeis', label: 'Papeis', open: false },
      { id: 'estatisticas', label: 'Estatisticas', open: true },
      { id: 'derivadas', label: 'Derivadas', open: false },
      { id: 'habilidades', label: 'Habilidades', open: false },
      { id: 'combate', label: 'Combate', open: false },
      { id: 'cyberware', label: 'Cyberware', open: false },
      { id: 'estiloVida', label: 'Estilo de Vida', open: false },
      { id: 'moradia', label: 'Moradia', open: false },
      { id: 'lifepath', label: 'Lifepath', open: false },
      { id: 'progressao', label: 'Progressao', open: false },
      { id: 'reputacao', label: 'Reputacao', open: false },
      { id: 'equipamento', label: 'Equipamento', open: false },
    ],
    []
  );

  const roleOptions = useMemo(() => ROLE_LIBRARY.map((role) => role.papel), []);
  const selectedRole = useMemo(
    () => ROLE_LIBRARY.find((role) => role.papel === sheet.identificacao.papel) || null,
    [sheet.identificacao.papel]
  );

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
    if (!campaignId || !playerId || !hydrated) return;
    setStoredState({
      campaignId,
      playerId,
      scope: SHEET_SCOPE,
      data: sheet,
    });
  }, [campaignId, hydrated, playerId, sheet]);

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const updateSection = (sectionKey, field, value) => {
    setSheet((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value,
      },
    }));
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

  const handleAddLanguage = () => {
    const value = newLanguage.trim();
    if (!value) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.linguas = [...next.lifepath.linguas, value];
      return next;
    });
    setNewLanguage('');
  };

  const handleRemoveLanguage = (index) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.linguas = next.lifepath.linguas.filter((_, idx) => idx !== index);
      return next;
    });
  };

  const handleAddFriend = () => {
    const value = newFriend.trim();
    if (!value) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.amigos = [...next.lifepath.amigos, { relacao: value }];
      return next;
    });
    setNewFriend('');
  };

  const handleRemoveFriend = (index) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.amigos = next.lifepath.amigos.filter((_, idx) => idx !== index);
      return next;
    });
  };

  const handleAddEnemy = () => {
    if (!newEnemy.quem.trim()) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.inimigos = [...next.lifepath.inimigos, { ...newEnemy }];
      return next;
    });
    setNewEnemy({ quem: '', causa: '', poder: '', acao: '' });
  };

  const handleRemoveEnemy = (index) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.inimigos = next.lifepath.inimigos.filter((_, idx) => idx !== index);
      return next;
    });
  };

  const handleAddLove = () => {
    const value = newLove.trim();
    if (!value) return;
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.amoresTragicos = [...next.lifepath.amoresTragicos, { fim: value }];
      return next;
    });
    setNewLove('');
  };

  const handleRemoveLove = (index) => {
    playSound('button');
    setSheet((prev) => {
      const next = cloneValue(prev);
      next.lifepath.amoresTragicos = next.lifepath.amoresTragicos.filter((_, idx) => idx !== index);
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
                onChange={(event) => updateSection('identificacao', 'papel', event.target.value)}
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
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <select
                className="entry-input"
                value={sheet.identificacao.papel}
                onChange={(event) => updateSection('identificacao', 'papel', event.target.value)}
              >
                <option value="">Selecione um papel</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <div className="entry-tag">Papeis cadastrados: {roleOptions.length}</div>
            </div>

            {!selectedRole ? (
              <div className="entry-card">
                <div className="entry-card-title">Papeis disponiveis</div>
                <div className="entry-actions">
                  {roleOptions.map((role) => (
                    <span key={role} className="entry-tag">
                      {role}
                    </span>
                  ))}
                </div>
                <div className="entry-card-text">Selecione um papel para ver os detalhes.</div>
              </div>
            ) : (
              <>
                <div className="entry-card">
                  <div className="entry-card-title">{selectedRole.papel}</div>
                  <div className="entry-card-text">{selectedRole.descricao}</div>
                </div>

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
              </>
            )}
          </div>
        </details>
      );
    }

    if (section.id === 'estatisticas') {
      return (
        <details key={section.id} className="character-section" open={section.open}>
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="character-stats-grid">
              {STAT_KEYS.map((key) => (
                <input
                  key={key}
                  className="entry-input"
                  type="number"
                  placeholder={key}
                  value={sheet.estatisticas[key]}
                  onChange={(event) => updateNested(['estatisticas', key], toNumber(event.target.value))}
                />
              ))}
              <input
                className="entry-input"
                type="number"
                placeholder="maxLUCK"
                value={sheet.estatisticas.maxLUCK}
                onChange={(event) => updateNested(['estatisticas', 'maxLUCK'], toNumber(event.target.value))}
              />
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
                onChange={(event) => updateNested(['derivadas', 'hp'], toNumber(event.target.value))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="HP Max"
                value={sheet.derivadas.hpMax}
                onChange={(event) => updateNested(['derivadas', 'hpMax'], toNumber(event.target.value))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Ferimento Grave"
                value={sheet.derivadas.seriouslyWounded}
                onChange={(event) =>
                  updateNested(['derivadas', 'seriouslyWounded'], toNumber(event.target.value))
                }
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Death Save"
                value={sheet.derivadas.deathSave}
                onChange={(event) => updateNested(['derivadas', 'deathSave'], toNumber(event.target.value))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Humanidade"
                value={sheet.derivadas.humanidade}
                onChange={(event) => updateNested(['derivadas', 'humanidade'], toNumber(event.target.value))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Humanidade Max"
                value={sheet.derivadas.humanidadeMax}
                onChange={(event) =>
                  updateNested(['derivadas', 'humanidadeMax'], toNumber(event.target.value))
                }
              />
              <input
                className="entry-input"
                type="number"
                placeholder="EMP Atual"
                value={sheet.derivadas.empAtual}
                onChange={(event) => updateNested(['derivadas', 'empAtual'], toNumber(event.target.value))}
              />
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'habilidades') {
      const skillEntries = Object.entries(sheet.habilidades || {});
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Nome da habilidade"
                value={newSkillName}
                onChange={(event) => setNewSkillName(event.target.value)}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Nivel"
                value={newSkillNivel}
                onChange={(event) => setNewSkillNivel(event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="STAT"
                value={newSkillStat}
                onChange={(event) => setNewSkillStat(event.target.value)}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Base"
                value={newSkillBase}
                onChange={(event) => setNewSkillBase(event.target.value)}
              />
              <button className="mission-add-btn" onClick={handleAddSkill}>ADICIONAR</button>
            </div>
            {skillEntries.length ? (
              <div className="entries-list">
                {skillEntries.map(([name, skill]) => (
                  <div key={name} className="character-inline-row">
                    <div className="character-inline-title">{name}</div>
                    <input
                      className="entry-input"
                      type="number"
                      placeholder="Nivel"
                      value={skill?.nivel ?? ''}
                      onChange={(event) =>
                        handleSkillUpdate(name, 'nivel', toNumber(event.target.value))
                      }
                    />
                    <input
                      className="entry-input"
                      placeholder="STAT"
                      value={skill?.stat ?? ''}
                      onChange={(event) => handleSkillUpdate(name, 'stat', event.target.value)}
                    />
                    <input
                      className="entry-input"
                      type="number"
                      placeholder="Base"
                      value={skill?.base ?? ''}
                      onChange={(event) =>
                        handleSkillUpdate(name, 'base', toNumber(event.target.value))
                      }
                    />
                    <button className="mission-delete-btn" onClick={() => handleRemoveSkill(name)}>
                      EXCLUIR
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="placeholder-box">Nenhuma habilidade cadastrada.</div>
            )}
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
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Tipo"
                value={sheet.estiloVida.tipo}
                onChange={(event) => updateSection('estiloVida', 'tipo', event.target.value)}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Custo mensal"
                value={sheet.estiloVida.custoMensal}
                onChange={(event) => updateSection('estiloVida', 'custoMensal', toNumber(event.target.value))}
              />
              <input
                className="entry-input"
                placeholder="Pago ate"
                value={sheet.estiloVida.pagoAte}
                onChange={(event) => updateSection('estiloVida', 'pagoAte', event.target.value)}
              />
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'moradia') {
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Tipo"
                value={sheet.moradia.tipo}
                onChange={(event) => updateSection('moradia', 'tipo', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Localizacao"
                value={sheet.moradia.localizacao}
                onChange={(event) => updateSection('moradia', 'localizacao', event.target.value)}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Aluguel mensal"
                value={sheet.moradia.aluguelMensal}
                onChange={(event) => updateSection('moradia', 'aluguelMensal', toNumber(event.target.value))}
              />
              <input
                className="entry-input"
                placeholder="Pago ate"
                value={sheet.moradia.pagoAte}
                onChange={(event) => updateSection('moradia', 'pagoAte', event.target.value)}
              />
            </div>
          </div>
        </details>
      );
    }

    if (section.id === 'lifepath') {
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form">
              <input
                className="entry-input"
                placeholder="Origem cultural"
                value={sheet.lifepath.origemCultural}
                onChange={(event) => updateSection('lifepath', 'origemCultural', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Personalidade"
                value={sheet.lifepath.personalidade}
                onChange={(event) => updateSection('lifepath', 'personalidade', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Estilo de roupa"
                value={sheet.lifepath.estiloRoupa}
                onChange={(event) => updateSection('lifepath', 'estiloRoupa', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Penteado"
                value={sheet.lifepath.penteado}
                onChange={(event) => updateSection('lifepath', 'penteado', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Adorno"
                value={sheet.lifepath.adorno}
                onChange={(event) => updateSection('lifepath', 'adorno', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Valor mais importante"
                value={sheet.lifepath.valorMaisImportante}
                onChange={(event) => updateSection('lifepath', 'valorMaisImportante', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Sentimento sobre pessoas"
                value={sheet.lifepath.sentimentoPessoas}
                onChange={(event) => updateSection('lifepath', 'sentimentoPessoas', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Pessoa mais importante"
                value={sheet.lifepath.pessoaMaisImportante}
                onChange={(event) => updateSection('lifepath', 'pessoaMaisImportante', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Posse mais valiosa"
                value={sheet.lifepath.posseMaisValiosa}
                onChange={(event) => updateSection('lifepath', 'posseMaisValiosa', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Background familiar"
                value={sheet.lifepath.backgroundFamiliar}
                onChange={(event) => updateSection('lifepath', 'backgroundFamiliar', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Crise familiar"
                value={sheet.lifepath.criseFamiliar}
                onChange={(event) => updateSection('lifepath', 'criseFamiliar', event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Meta de vida"
                value={sheet.lifepath.metaVida}
                onChange={(event) => updateSection('lifepath', 'metaVida', event.target.value)}
              />
            </div>

            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Idioma"
                value={newLanguage}
                onChange={(event) => setNewLanguage(event.target.value)}
              />
              <button className="mission-add-btn" onClick={handleAddLanguage}>ADICIONAR IDIOMA</button>
            </div>
            {sheet.lifepath.linguas.length ? (
              <div className="entries-list">
                {sheet.lifepath.linguas.map((lang, index) => (
                  <div key={`${lang}-${index}`} className="entry-card">
                    <div className="entry-card-title">{lang}</div>
                    <button className="mission-delete-btn" onClick={() => handleRemoveLanguage(index)}>
                      EXCLUIR
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Relacao de amigo"
                value={newFriend}
                onChange={(event) => setNewFriend(event.target.value)}
              />
              <button className="mission-add-btn" onClick={handleAddFriend}>ADICIONAR AMIGO</button>
            </div>
            {sheet.lifepath.amigos.length ? (
              <div className="entries-list">
                {sheet.lifepath.amigos.map((friend, index) => (
                  <div key={`${friend.relacao}-${index}`} className="entry-card">
                    <div className="entry-card-title">{friend.relacao}</div>
                    <button className="mission-delete-btn" onClick={() => handleRemoveFriend(index)}>
                      EXCLUIR
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="entry-form">
              <input
                className="entry-input"
                placeholder="Inimigo: quem"
                value={newEnemy.quem}
                onChange={(event) => setNewEnemy((prev) => ({ ...prev, quem: event.target.value }))}
              />
              <input
                className="entry-input"
                placeholder="Inimigo: causa"
                value={newEnemy.causa}
                onChange={(event) => setNewEnemy((prev) => ({ ...prev, causa: event.target.value }))}
              />
              <input
                className="entry-input"
                placeholder="Inimigo: poder"
                value={newEnemy.poder}
                onChange={(event) => setNewEnemy((prev) => ({ ...prev, poder: event.target.value }))}
              />
              <input
                className="entry-input"
                placeholder="Inimigo: acao"
                value={newEnemy.acao}
                onChange={(event) => setNewEnemy((prev) => ({ ...prev, acao: event.target.value }))}
              />
              <button className="mission-add-btn" onClick={handleAddEnemy}>ADICIONAR INIMIGO</button>
            </div>
            {sheet.lifepath.inimigos.length ? (
              <div className="entries-list">
                {sheet.lifepath.inimigos.map((enemy, index) => (
                  <div key={`${enemy.quem}-${index}`} className="entry-card">
                    <div className="entry-card-title">{enemy.quem}</div>
                    <div className="entry-card-text">Causa: {enemy.causa}</div>
                    <div className="entry-card-text">Poder: {enemy.poder}</div>
                    <div className="entry-card-text">Acao: {enemy.acao}</div>
                    <button className="mission-delete-btn" onClick={() => handleRemoveEnemy(index)}>
                      EXCLUIR
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Amor tragico"
                value={newLove}
                onChange={(event) => setNewLove(event.target.value)}
              />
              <button className="mission-add-btn" onClick={handleAddLove}>ADICIONAR AMOR</button>
            </div>
            {sheet.lifepath.amoresTragicos.length ? (
              <div className="entries-list">
                {sheet.lifepath.amoresTragicos.map((love, index) => (
                  <div key={`${love.fim}-${index}`} className="entry-card">
                    <div className="entry-card-title">{love.fim}</div>
                    <button className="mission-delete-btn" onClick={() => handleRemoveLove(index)}>
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

    if (section.id === 'progressao') {
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
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
          </div>
        </details>
      );
    }

    if (section.id === 'reputacao') {
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <input
                className="entry-input"
                type="number"
                placeholder="Nivel"
                value={sheet.reputacao.nivel}
                onChange={(event) => updateSection('reputacao', 'nivel', toNumber(event.target.value))}
              />
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
        </details>
      );
    }

    if (section.id === 'equipamento') {
      return (
        <details key={section.id} className="character-section">
          <summary className="character-section-title">{section.label}</summary>
          <div className="character-section-body">
            <div className="entry-form compact">
              <input
                className="entry-input"
                type="number"
                placeholder="Dinheiro (eb)"
                value={sheet.equipamento.dinheiro}
                onChange={(event) => updateSection('equipamento', 'dinheiro', toNumber(event.target.value))}
              />
            </div>

            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Municao: tipo"
                value={newAmmo.tipo}
                onChange={(event) => setNewAmmo((prev) => ({ ...prev, tipo: event.target.value }))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Quantidade"
                value={newAmmo.quantidade}
                onChange={(event) => setNewAmmo((prev) => ({ ...prev, quantidade: event.target.value }))}
              />
              <button className="mission-add-btn" onClick={handleAddAmmo}>ADICIONAR MUNICAO</button>
            </div>
            {Object.keys(sheet.equipamento.municao).length ? (
              <div className="entries-list">
                {Object.entries(sheet.equipamento.municao).map(([tipo, quantidade]) => (
                  <div key={tipo} className="entry-card">
                    <div className="entry-card-title">{tipo}</div>
                    <div className="entry-card-text">Qtd: {quantidade}</div>
                    <button className="mission-delete-btn" onClick={() => handleRemoveAmmo(tipo)}>
                      EXCLUIR
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Granada: tipo"
                value={newGrenade.tipo}
                onChange={(event) => setNewGrenade((prev) => ({ ...prev, tipo: event.target.value }))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Quantidade"
                value={newGrenade.quantidade}
                onChange={(event) => setNewGrenade((prev) => ({ ...prev, quantidade: event.target.value }))}
              />
              <button className="mission-add-btn" onClick={handleAddGrenade}>ADICIONAR GRANADA</button>
            </div>
            {Object.keys(sheet.equipamento.granadas).length ? (
              <div className="entries-list">
                {Object.entries(sheet.equipamento.granadas).map(([tipo, quantidade]) => (
                  <div key={tipo} className="entry-card">
                    <div className="entry-card-title">{tipo}</div>
                    <div className="entry-card-text">Qtd: {quantidade}</div>
                    <button className="mission-delete-btn" onClick={() => handleRemoveGrenade(tipo)}>
                      EXCLUIR
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="entry-form compact">
              <input
                className="entry-input"
                placeholder="Item"
                value={newItem.nome}
                onChange={(event) => setNewItem((prev) => ({ ...prev, nome: event.target.value }))}
              />
              <input
                className="entry-input"
                type="number"
                placeholder="Quantidade"
                value={newItem.quantidade}
                onChange={(event) => setNewItem((prev) => ({ ...prev, quantidade: event.target.value }))}
              />
              <button className="mission-add-btn" onClick={handleAddItem}>ADICIONAR ITEM</button>
            </div>
            {sheet.equipamento.itens.length ? (
              <div className="entries-list">
                {sheet.equipamento.itens.map((item, index) => (
                  <div key={`${item.nome}-${index}`} className="entry-card">
                    <div className="entry-card-title">{item.nome}</div>
                    <div className="entry-form compact">
                      <input
                        className="entry-input"
                        type="number"
                        placeholder="Quantidade"
                        value={item.quantidade ?? ''}
                        onChange={(event) =>
                          handleUpdateItem(index, 'quantidade', toNumber(event.target.value))
                        }
                      />
                      <button className="mission-delete-btn" onClick={() => handleRemoveItem(index)}>
                        EXCLUIR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </details>
      );
    }

    return null;
  };

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
        Estrutura completa de ficha. Tudo editavel e salvo por player.
      </div>

      {sections.map(renderSection)}
    </div>
  );
}

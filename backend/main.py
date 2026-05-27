from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import tempfile
import os
import math

app = FastAPI(title="Boas Práticas Analytics")

# =====================================
# CACHE EM MEMÓRIA
# =====================================

ULTIMO_RESULTADO = {}

# =====================================
# CORS
# =====================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================
# HOME
# =====================================

@app.get("/")
def home():

    return {
        "message": "Backend funcionando!"
    }

# =====================================
# AUDITORIA ENDPOINT
# =====================================

@app.get("/auditoria")
def obter_auditoria():

    global ULTIMO_RESULTADO

    return ULTIMO_RESULTADO

# =====================================
# FUNÇÕES AUXILIARES
# =====================================

def excel_col_to_index(col):

    index = 0

    for char in col:

        index = (
            index * 26
            + (
                ord(char.upper())
                - ord("A")
                + 1
            )
        )

    return index - 1


def get_coluna(df, letra):

    indice = excel_col_to_index(letra)

    if indice >= len(df.columns):
        return None

    return df.columns[indice]


def safe_number(value):

    if value is None:
        return None

    if pd.isna(value):
        return None

    if isinstance(value, float):

        if (
            math.isnan(value)
            or math.isinf(value)
        ):
            return None

    return round(float(value), 2)


def valor_vazio(valor):

    return (
        pd.isna(valor)
        or str(valor).strip() == ""
    )


def idade_menor_18(data_nascimento):

    nascimento = pd.to_datetime(
        data_nascimento,
        errors="coerce"
    )

    if pd.isna(nascimento):
        return False

    hoje = pd.Timestamp.today()

    idade = (
        hoje.year
        - nascimento.year
        - (
            (
                hoje.month,
                hoje.day
            )
            < (
                nascimento.month,
                nascimento.day
            )
        )
    )

    return idade < 18


def tempo_maior_que(valor, limite):

    valor = pd.to_numeric(
        valor,
        errors="coerce"
    )

    if pd.isna(valor):
        return False

    return valor > limite

# =====================================
# UPLOAD
# =====================================

@app.post("/upload")
async def upload_excel(
    file: UploadFile = File(...)
):

    suffix = os.path.splitext(
        file.filename
    )[1]

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix
    ) as temp:

        temp.write(
            await file.read()
        )

        temp_path = temp.name

    try:

        df = pd.read_excel(
            temp_path,
            sheet_name="Inconsistências"
        )

        df.columns = (
            df.columns
            .astype(str)
            .str.strip()
        )

        coluna_unidade = (
            "Data Access Group"
        )

        if (
            coluna_unidade
            not in df.columns
        ):

            return {
                "status": "error",
                "message":
                    "Coluna Data Access Group não encontrada"
            }

        coluna_data_admissao = (
            get_coluna(df, "I")
        )

        if coluna_data_admissao is None:

            return {
                "status": "error",
                "message":
                    "Coluna I não encontrada"
            }

        df[coluna_data_admissao] = (
            pd.to_datetime(
                df[coluna_data_admissao],
                errors="coerce"
            )
        )

        # =====================================
        # MÉTRICAS
        # =====================================

        metricas = {

            "Tempo Porta-ECG": "FA",
            "Tempo Porta-Agulha": "FB",
            "Tempo porta avaliação médica no AVC": "FC",
            "SCA - Tempo Porta-Médico": "FD",
            "Sepse - Tempo Porta-Médico": "FE",
            "Sepse - Tempo administração de ATB": "FF",
            "Sepse - Tempo coleta de lactato": "FG",
            "Sepse - Tempo coleta de hemocultura": "FH",
            "AVC - Tempo Porta-Médico": "FI",
            "SCA - Tempo Médico-Decisão": "FJ",
            "Sepse - Tempo Médico-Decisão": "FK",
            "AVC - Tempo Médico-Decisão": "FL"
        }

        # =====================================
        # TEMPOS ASTRONÔMICOS
        # =====================================

        regras_tempos = {

            "FA": 300,
            "FB": 300,
            "FC": 300,
            "FD": 300,
            "FE": 300,
            "FF": 300,
            "FG": 300,
            "FH": 300,
            "FI": 300,

            "FJ": 14400,
            "FK": 14400,
            "FL": 14400,
            "FM": 14400,
            "FN": 14400,
            "FO": 14400
        }

        # =====================================
        # ESTRUTURAS
        # =====================================

        ranking_geral = []

        auditoria = {
            "registros": [],
            "por_unidade": {}
        }

        # =====================================
        # UNIDADES
        # =====================================

        df[coluna_unidade] = (
            df[coluna_unidade]
            .astype(str)
            .str.strip()
        )

        unidades = (
            df[coluna_unidade]
            .dropna()
            .unique()
        )

        # =====================================
        # LOOP DAS UNIDADES
        # =====================================

        for unidade in unidades:

            df_unidade = df[
                df[coluna_unidade]
                == unidade
            ].copy()

            df_unidade = (
                df_unidade.dropna(
                    subset=[
                        coluna_data_admissao
                    ]
                )
            )

            if df_unidade.empty:
                continue

            # =====================================
            # AUDITORIA
            # =====================================

            inconsistencias_unidade = []

            for idx, row in (
                df_unidade.iterrows()
            ):

                inconsistencias = []

                # MENOR DE 18

                coluna_nascimento = (
                    get_coluna(df, "F")
                )

                if coluna_nascimento:

                    if idade_menor_18(
                        row[coluna_nascimento]
                    ):

                        inconsistencias.append({

                            "tipo":
                                "idade_invalida",

                            "campo":
                                "Data Nascimento",

                            "coluna":
                                "F"
                        })

                # TIPO SCA

                coluna_tipo_sca = (
                    get_coluna(df, "AG")
                )

                if coluna_tipo_sca:

                    if valor_vazio(
                        row[coluna_tipo_sca]
                    ):

                        inconsistencias.append({

                            "tipo":
                                "tipo_sca_vazio",

                            "campo":
                                "Tipo SCA",

                            "coluna":
                                "AG"
                        })

                # TEMPOS ASTRONÔMICOS

                for letra, limite in (
                    regras_tempos.items()
                ):

                    coluna_tempo = (
                        get_coluna(
                            df,
                            letra
                        )
                    )

                    if coluna_tempo:

                        valor = row[
                            coluna_tempo
                        ]

                        if tempo_maior_que(
                            valor,
                            limite
                        ):

                            inconsistencias.append({

                                "tipo":
                                    "tempo_astronomico",

                                "campo":
                                    letra,

                                "valor":
                                    safe_number(valor)
                            })

                # SALVA REGISTRO

                if inconsistencias:

                    registro = {

                        "linha_excel":
                            int(idx + 2),

                        "unidade":
                            str(unidade),

                        "total_inconsistencias":
                            len(inconsistencias),

                        "inconsistencias":
                            inconsistencias
                    }

                    inconsistencias_unidade.append(
                        registro
                    )

                    auditoria[
                        "registros"
                    ].append(
                        registro
                    )

            # =====================================
            # BASELINE
            # =====================================

            primeira_data = (
                df_unidade[
                    coluna_data_admissao
                ].min()
            )

            fim_baseline = (
                primeira_data
                + pd.DateOffset(months=2)
            )

            df_baseline = df_unidade[
                df_unidade[
                    coluna_data_admissao
                ] < fim_baseline
            ]

            df_atual = df_unidade[
                df_unidade[
                    coluna_data_admissao
                ] >= fim_baseline
            ]

            melhorias = []

            detalhes = {}

            # =====================================
            # MÉTRICAS
            # =====================================

            for nome, letra in (
                metricas.items()
            ):

                indice = (
                    excel_col_to_index(
                        letra
                    )
                )

                if indice >= len(df.columns):
                    continue

                coluna_real = (
                    df.columns[indice]
                )

                baseline = pd.to_numeric(
                    df_baseline[
                        coluna_real
                    ],
                    errors="coerce"
                ).dropna()

                atual = pd.to_numeric(
                    df_atual[
                        coluna_real
                    ],
                    errors="coerce"
                ).dropna()

                baseline_mediana = None
                atual_mediana = None
                melhoria = None
                percentual = None

                if (
                    not baseline.empty
                    and not atual.empty
                ):

                    baseline_mediana = (
                        baseline.median()
                    )

                    atual_mediana = (
                        atual.median()
                    )

                    melhoria = (
                        baseline_mediana
                        - atual_mediana
                    )

                    if baseline_mediana != 0:

                        percentual = (
                            melhoria
                            / baseline_mediana
                        ) * 100

                    melhorias.append(
                        melhoria
                    )

                detalhes[nome] = {

                    "baseline_mediana":
                        safe_number(
                            baseline_mediana
                        ),

                    "atual_mediana":
                        safe_number(
                            atual_mediana
                        ),

                    "melhoria":
                        safe_number(
                            melhoria
                        ),

                    "percentual_melhoria":
                        safe_number(
                            percentual
                        )
                }

            # =====================================
            # SCORE
            # =====================================

            score = (

                sum(melhorias)
                / len(melhorias)

                if melhorias
                else None
            )

            # =====================================
            # RANKING
            # =====================================

            ranking_geral.append({

                "unidade":
                    str(unidade),

                "score_melhoria":
                    safe_number(score),

                "detalhes_tempos":
                    detalhes
            })

            # =====================================
            # AUDITORIA POR UNIDADE
            # =====================================

            auditoria[
                "por_unidade"
            ][str(unidade)] = {

                "total_registros_com_inconsistencia":
                    len(
                        inconsistencias_unidade
                    ),

                "total_inconsistencias":
                    sum(
                        item[
                            "total_inconsistencias"
                        ]
                        for item
                        in inconsistencias_unidade
                    ),

                "registros":
                    inconsistencias_unidade[:50],

                "detalhes_tempos":
                    detalhes
            }

        # =====================================
        # ORDENAÇÃO
        # =====================================

        ranking_geral = sorted(

            ranking_geral,

            key=lambda x:
                x["score_melhoria"]
                if x["score_melhoria"]
                is not None
                else -999999,

            reverse=True
        )

        for posicao, item in enumerate(
            ranking_geral,
            start=1
        ):

            item["ranking"] = posicao

        # =====================================
        # RESUMO
        # =====================================

        resumo = {

            "melhor_unidade":
                ranking_geral[0]["unidade"]
                if ranking_geral
                else None,

            "pior_unidade":
                ranking_geral[-1]["unidade"]
                if ranking_geral
                else None
        }

        # =====================================
        # CACHE
        # =====================================

        global ULTIMO_RESULTADO

        ULTIMO_RESULTADO = {

            "auditoria":
                auditoria,

            "ranking":
                ranking_geral
        }

        # =====================================
        # RETORNO
        # =====================================

        return {

            "status":
                "success",

            "total_unidades":
                len(ranking_geral),

            "resumo_ranking":
                resumo,

            "ranking_geral_melhoria":
                ranking_geral
        }

    finally:

        os.remove(temp_path)
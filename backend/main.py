from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import tempfile
import os
import math

app = FastAPI(title="Boas Práticas Analytics")

# =====================================
# CACHE
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
# AUDITORIA
# =====================================

@app.get("/auditoria")
def obter_auditoria():

    global ULTIMO_RESULTADO

    return ULTIMO_RESULTADO

# =====================================
# AUXILIARES
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

        print("LENDO PLANILHA...")

        df = pd.read_excel(
            temp_path,
            sheet_name="Inconsistências"
        )

        print("PLANILHA CARREGADA")
        print("LINHAS:", len(df))

        df.columns = (
            df.columns
            .astype(str)
            .str.strip()
        )

        coluna_unidade = get_coluna(df, "C")

        if coluna_unidade is None:

            return {
                "status": "error",
                "message":
                    "Coluna C não encontrada"
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

        # =====================================
        # CONVERSÕES
        # =====================================

        df[coluna_data_admissao] = pd.to_datetime(
            df[coluna_data_admissao],
            errors="coerce"
        )

        df[coluna_unidade] = (
            df[coluna_unidade]
            .astype(str)
            .str.strip()
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
        # RANKING
        # =====================================

        ranking_geral = []

        unidades = (
            df[coluna_unidade]
            .dropna()
            .unique()
        )

        print("TOTAL UNIDADES:", len(unidades))

        # =====================================
        # LOOP UNIDADES
        # =====================================

        for unidade in unidades:

            print(
                f"PROCESSANDO: {unidade}"
            )

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

            detalhes = {}

            total_verdes = 0
            total_amarelos = 0
            total_vermelhos = 0

            # =====================================
            # MÉTRICAS
            # =====================================

            for nome, letra in metricas.items():

                print(
                    f"Calculando: {nome}"
                )

                coluna_real = get_coluna(
                    df,
                    letra
                )

                if not coluna_real:
                    continue

                baseline = pd.to_numeric(
                    df_baseline[coluna_real],
                    errors="coerce"
                ).dropna()

                atual = pd.to_numeric(
                    df_atual[coluna_real],
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

                percentual_safe = safe_number(
                    percentual
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
                        percentual_safe
                }

                # =====================================
                # CORES
                # =====================================

                if percentual_safe is None:

                    total_vermelhos += 1

                elif percentual_safe >= 21:

                    total_verdes += 1

                elif percentual_safe >= 1:

                    total_amarelos += 1

                else:

                    total_vermelhos += 1

            # =====================================
            # SCORE
            # =====================================

            score = (
                total_verdes * 100
                + total_amarelos
            )

            ranking_geral.append({

                "unidade":
                    str(unidade),

                "score_melhoria":
                    int(score),

                "total_verdes":
                    total_verdes,

                "total_amarelos":
                    total_amarelos,

                "total_vermelhos":
                    total_vermelhos,

                "detalhes_tempos":
                    detalhes
            })

        # =====================================
        # ORDENAÇÃO
        # =====================================

        ranking_geral = sorted(

            ranking_geral,

            key=lambda x: (

                x.get("total_verdes", 0),
                x.get("total_amarelos", 0)

            ),

            reverse=True
        )

        for posicao, item in enumerate(
            ranking_geral,
            start=1
        ):

            item["ranking"] = posicao

        # =====================================
        # CACHE
        # =====================================

        global ULTIMO_RESULTADO

        ULTIMO_RESULTADO = {

            "ranking":
                ranking_geral
        }

        print("FINALIZADO COM SUCESSO")

        # =====================================
        # RETORNO
        # =====================================

        return {

            "status":
                "success",

            "total_unidades":
                len(ranking_geral),

            "ranking_geral_melhoria":
                ranking_geral
        }

    except Exception as e:

        print("ERRO:", str(e))

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        os.remove(temp_path)
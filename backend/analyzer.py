import pandas as pd


def analyze_excel(file_path: str):
    df = pd.read_excel(file_path, sheet_name="Inconsistências")

    # Ajuste conforme sua planilha
    col_unidade = "Unidade"

    if col_unidade not in df.columns:
        raise ValueError(f"Coluna '{col_unidade}' não encontrada.")

    resumo = (
        df.groupby(col_unidade)
        .size()
        .reset_index(name="total_inconsistencias")
        .sort_values("total_inconsistencias", ascending=False)
    )

    resultados = []

    for _, row in resumo.iterrows():
        total = int(row["total_inconsistencias"])

        if total >= 30:
            status = "Crítico"
        elif total >= 10:
            status = "Atenção"
        else:
            status = "Estável"

        resultados.append({
            "unidade": row[col_unidade],
            "total_inconsistencias": total,
            "status": status,
            "resumo": f"A unidade {row[col_unidade]} apresentou {total} inconsistências. Status: {status}."
        })

    return resultados
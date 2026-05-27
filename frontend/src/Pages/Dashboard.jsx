import React, { useEffect, useMemo, useState } from "react";
import "../App.css";

const Dashboard = () => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filtroUnidade, setFiltroUnidade] = useState("");
  const [somenteTop10, setSomenteTop10] =
    useState(false);

  const metricas = [
    "Tempo Porta-ECG",
    "Tempo Porta-Agulha",
    "Tempo porta avaliação médica no AVC",
    "SCA - Tempo Porta-Médico",
    "Sepse - Tempo Porta-Médico",
    "Sepse - Tempo administração de ATB",
    "Sepse - Tempo coleta de lactato",
    "Sepse - Tempo coleta de hemocultura",
    "AVC - Tempo Porta-Médico",
    "SCA - Tempo Médico-Decisão",
    "Sepse - Tempo Médico-Decisão",
    "AVC - Tempo Médico-Decisão",
  ];

  useEffect(() => {
    const cache =
      sessionStorage.getItem("rankingData");

    if (cache) {
      setDados(JSON.parse(cache));
    }
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);

    try {
      setLoading(true);

      const response = await fetch(
        "https://boas-praticas-api.onrender.com/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      console.log(result);

      const ranking =
        result.ranking_geral_melhoria || [];

      setDados(ranking);

      sessionStorage.setItem(
        "rankingData",
        JSON.stringify(ranking)
      );
    } catch (error) {
      console.error(error);

      alert(
        "Erro ao processar planilha."
      );
    } finally {
      setLoading(false);
    }
  };

  const getClasse = (valor) => {
    const numero = Number(valor || 0);

    if (numero >= 90) return "cell-gold";

    if (numero >= 60)
      return "cell-silver";

    if (numero >= 40)
      return "cell-bronze";

    return "cell-red";
  };

  const formatarValor = (valor) => {
    const numero = Number(valor || 0);

    return `${numero.toFixed(1)}%`;
  };

  const calcularMediaTotal = (detalhes) => {
    const percentuais = Object.values(
      detalhes || {}
    )
      .map(
        (item) =>
          item.percentual_melhoria
      )
      .filter(
        (valor) =>
          valor !== null &&
          valor !== undefined
      );

    if (percentuais.length === 0)
      return 0;

    const soma = percentuais.reduce(
      (acc, valor) => acc + valor,
      0
    );

    return soma / percentuais.length;
  };

  const dadosFiltrados = useMemo(() => {
    let lista = [...dados];

    if (filtroUnidade) {
      lista = lista.filter((item) =>
        item.unidade
          ?.toLowerCase()
          .includes(
            filtroUnidade.toLowerCase()
          )
      );
    }

    if (somenteTop10) {
      lista = lista.slice(0, 10);
    }

    return lista;
  }, [
    dados,
    filtroUnidade,
    somenteTop10,
  ]);

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1>
          Boas Práticas Analytics
        </h1>

        <label className="upload-button">
          Upload Planilha

          <input
            type="file"
            accept=".xlsx"
            hidden
            onChange={handleUpload}
          />
        </label>
      </div>

      {/* FILTROS */}

      <div className="filters-container">
        <input
          type="text"
          placeholder="Filtrar unidade..."
          className="filter-input"
          value={filtroUnidade}
          onChange={(e) =>
            setFiltroUnidade(
              e.target.value
            )
          }
        />

        <button
          className={`filter-button ${
            somenteTop10
              ? "filter-active"
              : ""
          }`}
          onClick={() =>
            setSomenteTop10(
              !somenteTop10
            )
          }
        >
          {somenteTop10
            ? "Mostrando Top 10"
            : "Filtrar Top 10"}
        </button>

        <button
          className="clear-filter-button"
          onClick={() => {
            setFiltroUnidade("");
            setSomenteTop10(false);
          }}
        >
          Limpar Filtros
        </button>
      </div>

      {loading && (
        <div className="loading">
          Processando planilha...
        </div>
      )}

      {!loading &&
        dadosFiltrados.length > 0 && (
          <div className="table-container">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>Ranking</th>

                  <th>Unidade</th>

                  {metricas.map(
                    (metrica) => (
                      <th key={metrica}>
                        {metrica}
                      </th>
                    )
                  )}

                  <th>Média Total</th>
                </tr>
              </thead>

              <tbody>
                {dadosFiltrados.map(
                  (item, index) => {
                    const mediaTotal =
                      calcularMediaTotal(
                        item.detalhes_tempos
                      );

                    return (
                      <tr key={index}>
                        <td
                          className={
                            index === 0
                              ? "rank-1"
                              : index === 1
                              ? "rank-2"
                              : index === 2
                              ? "rank-3"
                              : ""
                          }
                        >
                          {item.ranking}
                        </td>

                        <td className="unidade-cell">
                          {item.unidade}
                        </td>

                        {metricas.map(
                          (metrica) => {
                            const valor =
                              item
                                .detalhes_tempos?.[
                                metrica
                              ]
                                ?.percentual_melhoria ??
                              0;

                            return (
                              <td
                                key={
                                  metrica
                                }
                                className={getClasse(
                                  valor
                                )}
                              >
                                {formatarValor(
                                  valor
                                )}
                              </td>
                            );
                          }
                        )}

                        <td
                          className={`media-total ${getClasse(
                            mediaTotal
                          )}`}
                        >
                          {formatarValor(
                            mediaTotal
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
};

export default Dashboard;
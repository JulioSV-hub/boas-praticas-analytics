import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import "../App.css";

const Dashboard = () => {

  const [dados, setDados] =
    useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [uploadProgress, setUploadProgress] =
  useState(0);

  const [loadingText, setLoadingText] =
    useState("");

  const [
    unidadeSelecionada,
    setUnidadeSelecionada,
  ] = useState("");

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

  // =====================================
  // CACHE
  // =====================================

  useEffect(() => {

    

    const cache =
      sessionStorage.getItem(
        "rankingData"
      );

    if (cache) {

      const parsed =
        JSON.parse(cache);

      setDados(parsed);

      if (parsed.length > 0) {

        setUnidadeSelecionada(
          parsed[0].unidade
        );
      }
    }

  }, []);

  // =====================================
  // UPLOAD
  // =====================================

  const handleUpload =
    async (event) => {

      const file =
        event.target.files[0];

      if (!file) return;

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      let interval;

        try {

          setLoading(true);

          setUploadProgress(0);

          setLoadingText(
            "Enviando planilha..."
          );

          interval = setInterval(() => {

            setUploadProgress((old) => {

              if (old >= 90) {
                return old;
              }

              return old + 5;
            });

        }, 400);

        const response =
          await fetch(
            "https://boas-praticas-api.onrender.com/upload",
            {
              method: "POST",
              body: formData,
            }
          );

        if (!response.ok) {

          throw new Error(
            "Erro ao enviar planilha"
          );
        }

        const result =
          await response.json();

          setLoadingText(
            "Processando indicadores..."
          );

          setUploadProgress(100);

          clearInterval(interval);

        console.log(
          "RESULTADO BACKEND:",
          result
        );

        const ranking =
          Array.isArray(
            result?.ranking_geral_melhoria
          )
            ? result.ranking_geral_melhoria
            : [];

        console.log(
          "RANKING:",
          ranking
        );

        setDados(ranking);

        sessionStorage.setItem(
          "rankingData",
          JSON.stringify(ranking)
        );

        if (ranking.length > 0) {

          setUnidadeSelecionada(
            ranking[0].unidade
          );
        }

      } catch (error) {

        console.error(error);

        alert(
          "Erro ao processar planilha."
        );

      } finally {

        clearInterval(interval);

        setLoading(false);
      }
    };

  // =====================================
  // CORES
  // =====================================

  const getClasse = (
      valor,
      metrica,
      unidade
    ) => {

      const numero =
        Number(valor || 0);

      // =====================================
      // VALORES ATUAIS
      // =====================================

      const atual =
        unidade
          ?.detalhes_tempos?.[
            metrica
          ]
          ?.atual_mediana;

      // =====================================
      // METAS
      // =====================================

      const metas = {

        "Tempo Porta-ECG": 10,

        "Tempo Porta-Agulha": 30,

        "Tempo porta avaliação médica no AVC": 10,

        "SCA - Tempo Porta-Médico": 10,

        "Sepse - Tempo Porta-Médico": 10,

        "AVC - Tempo Porta-Médico": 10,

        "SCA - Tempo Médico-Decisão": 60,

        "Sepse - Tempo Médico-Decisão": 60,

        "AVC - Tempo Médico-Decisão": 60
      };

      // =====================================
      // MÉTRICAS DE TEMPO
      // =====================================

      if (metas[metrica] !== undefined) {

        const meta = metas[metrica];

        // excelente mesmo sem melhoria
        if (
          atual !== null &&
          atual <= meta
        ) {
          return "cell-green";
        }

        if (numero >= 21) {
          return "cell-green";
        }

        if (numero >= 1) {
          return "cell-yellow";
        }

        return "cell-red";
      }

      // =====================================
      // MÉTRICAS DE ADESÃO
      // =====================================

      const metasAdesao = [

        "Sepse - Tempo administração de ATB",

        "Sepse - Tempo coleta de lactato",

        "Sepse - Tempo coleta de hemocultura"
      ];

      if (
        metasAdesao.includes(
          metrica
        )
      ) {

        if (
          atual !== null &&
          atual >= 85
        ) {
          return "cell-green";
        }

        if (numero >= 21) {
          return "cell-green";
        }

        if (numero >= 1) {
          return "cell-yellow";
        }

        return "cell-red";
      }

      // fallback

      if (numero >= 21) {
        return "cell-green";
      }

      if (numero >= 1) {
        return "cell-yellow";
      }

      return "cell-red";
    };

  // =====================================
  // FORMATAÇÃO
  // =====================================

  const formatarValor = (
    valor
  ) => {

    const numero =
      Number(valor || 0);

    return `${numero.toFixed(0)}%`;
  };

  // =====================================
  // UNIDADE SELECIONADA
  // =====================================

  const unidadeAtual =
  useMemo(() => {

    // =====================================
    // TODOS
    // =====================================

    if (
      unidadeSelecionada ===
      "TODOS"
    ) {

      const consolidado = {

        detalhes_tempos: {}
      };

      metricas.forEach(
        (metrica) => {

          let somaPercentual = 0;
          let somaAtual = 0;
          let somaBaseline = 0;

          let contador = 0;

          dados.forEach(
            (item) => {

              const detalhe =
                item?.detalhes_tempos?.[
                  metrica
                ];

              if (!detalhe) return;

              const percentual =
                Number(
                  detalhe.percentual_melhoria || 0
                );

              const atual =
                Number(
                  detalhe.atual_mediana || 0
                );

              const baseline =
                Number(
                  detalhe.baseline_mediana || 0
                );

              somaPercentual += percentual;
              somaAtual += atual;
              somaBaseline += baseline;

              contador++;
            }
          );

          consolidado.detalhes_tempos[
            metrica
          ] = {

            percentual_melhoria:
              contador > 0
                ? somaPercentual / contador
                : 0,

            atual_mediana:
              contador > 0
                ? somaAtual / contador
                : 0,

            baseline_mediana:
              contador > 0
                ? somaBaseline / contador
                : 0
          };
        }
      );

      return consolidado;
    }

    // =====================================
    // UNIDADE NORMAL
    // =====================================

    return dados.find(
      (item) =>
        item.unidade ===
        unidadeSelecionada
    );

  }, [
    dados,
    unidadeSelecionada,
  ]);

  // =====================================
  // BOTÕES CICLOS
  // =====================================

  const handleCiclo =
    (nome) => {

      alert(
        `${nome} funcionando`
      );
    };

  // =====================================
  // RENDER
  // =====================================

  const dadosFiltrados =
  unidadeSelecionada === "TODOS"
    ? dados
    : dados.filter(
        (item) =>
          item.unidade ===
          unidadeSelecionada
      );
  
  return (

    <div className="dashboard-container">

      {/* HEADER */}

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
            onChange={
              handleUpload
            }
          />
        </label>

      </div>

      {/* LOADING */}

      {loading && (

        <div className="loading-overlay">

          <div className="loading-box">

            <h2>
              Processando Planilha
            </h2>

            <p>
              {loadingText}
            </p>

            <div className="progress-bar">

              <div
                className="progress-fill"
                style={{
                  width:
                    `${uploadProgress}%`
                }}
              />

            </div>

            <span>
              {uploadProgress}%
            </span>

          </div>

        </div>

      )}

      {/* FAROL SUPERIOR */}

      {!loading &&
        dados.length > 0 && (

        <div className="top-panel">

          <div className="select-container">

            <select
              value={
                unidadeSelecionada
              }
              onChange={(e) =>
                setUnidadeSelecionada(
                  e.target.value
                )
              }
            >

              <option value="TODOS">
                TODOS
              </option>

              {dados.map(
                (item) => (

                  <option
                    key={
                      item.unidade
                    }
                    value={
                      item.unidade
                    }
                  >

                    {item.unidade}

                  </option>
                )
              )}

            </select>

          </div>

          <div className="farol-grid">

            {metricas.map(
              (metrica) => {

                const valor =
                  unidadeAtual
                    ?.detalhes_tempos?.[
                    metrica
                  ]
                    ?.percentual_melhoria ?? 0;

                return (

                  <div
                    key={metrica}
                    className="farol-item"
                  >

                    <div
                      className={`farol-circle-table ${getClasse(
                        valor,
                        metrica,
                        unidadeAtual
                      )}`}

                      title={
                      "Baseline: " +
                      (
                        unidadeAtual
                          ?.detalhes_tempos?.[
                            metrica
                          ]
                          ?.baseline_mediana ?? "-"
                      ) +
                      "\nAtual: " +
                      (
                        unidadeAtual
                          ?.detalhes_tempos?.[
                            metrica
                          ]
                          ?.atual_mediana ?? "-"
                      ) +
                      "\nMelhoria: " +
                      Number(valor || 0).toFixed(0) +
                      "%"
                    }
                    >

                      {Number(valor || 0).toFixed(0)}%

                    </div>

                    <span>
                      {metrica}
                    </span>

                  </div>
                );
              }
            )}

          </div>

        </div>
      )}

      {/* BOTÕES */}

      <div className="ciclos-container">

        <button
          onClick={() =>
            handleCiclo(
              "1º ciclo"
            )
          }
        >
          1º ciclo
        </button>

        <button
          onClick={() =>
            handleCiclo(
              "2º ciclo"
            )
          }
        >
          2º ciclo
        </button>

        <button
          onClick={() =>
            handleCiclo(
              "3º ciclo"
            )
          }
        >
          3º ciclo
        </button>

        <button
          onClick={() =>
            handleCiclo(
              "Controle"
            )
          }
        >
          Controle
        </button>

      </div>

      {/* TABELA */}

      {!loading &&
        dados.length > 0 && (

        <div className="table-container">

          <table className="ranking-table">

            <thead>

              <tr>

                <th>
                  Ranking
                </th>

                <th>
                  Unidade
                </th>

                {metricas.map(
                  (metrica) => (

                    <th
                      key={
                        metrica
                      }
                    >

                      {metrica}

                    </th>
                  )
                )}

              </tr>

            </thead>

            <tbody>

              {dadosFiltrados.map(
                (item) => (

                  <tr
                    key={
                      item.unidade
                    }
                  >

                    <td>
                      {
                        item.ranking
                      }
                    </td>

                    <td className="unidade-cell">

                      {
                        item.unidade
                      }

                    </td>

                    {metricas.map(
                      (metrica) => {

                        const valor =
                          item
                            ?.detalhes_tempos?.[
                            metrica
                          ]
                            ?.percentual_melhoria ?? 0;

                        return (

                          <td
                            key={
                              metrica
                            }
                          >

                            <div
                              className={`farol-circle-table ${getClasse(
                                valor,
                                metrica,
                                item
                              )}`}

                              title={
                              "Baseline: " +
                              (
                                item
                                  ?.detalhes_tempos?.[
                                    metrica
                                  ]
                                  ?.baseline_mediana ?? "-"
                              ) +
                              "\nAtual: " +
                              (
                                item
                                  ?.detalhes_tempos?.[
                                    metrica
                                  ]
                                  ?.atual_mediana ?? "-"
                              ) +
                              "\nMelhoria: " +
                              Number(valor || 0).toFixed(0) +
                              "%"
                            }
                            >

                              {formatarValor(
                                valor
                              )}

                            </div>

                          </td>
                        );
                      }
                    )}

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>
      )}

    </div>
  );
};

export default Dashboard;
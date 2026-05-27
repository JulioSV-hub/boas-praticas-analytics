import {
  useEffect,
  useState
} from "react";

import {
  Link
} from "react-router-dom";

function Auditoria() {

  // =====================================
  // STATES
  // =====================================

  const [dados, setDados] =
    useState(null);

  const [
    unidadeSelecionada,
    setUnidadeSelecionada
  ] = useState("");

  // =====================================
  // CARREGA DADOS
  // =====================================

  useEffect(() => {

    async function carregar() {

      try {

        const response =
          await fetch(
            "http://127.0.0.1:8000/auditoria"
          );

        const data =
          await response.json();

        console.log(data);

        setDados(data);

      } catch (err) {

        console.error(err);
      }
    }

    carregar();

  }, []);

  // =====================================
  // DADOS
  // =====================================

  const auditoria =
    dados?.auditoria || {};

  const porUnidade =
    auditoria?.por_unidade || {};

  const unidades =
    Object.keys(porUnidade);

  const unidadesFiltradas =
    unidadeSelecionada
      ? {
          [unidadeSelecionada]:
            porUnidade[
              unidadeSelecionada
            ]
        }
      : porUnidade;

  // =====================================
  // JSX
  // =====================================

  return (

    <div className="container">

      {/* TOPO */}

      <div className="top-bar">

        <h1>
          Auditoria de Inconsistências
        </h1>

        <Link to="/">

          <button>
            Voltar
          </button>

        </Link>

      </div>

      {/* FILTRO */}

      <div className="table-card">

        <h2>
          Filtrar Unidade
        </h2>

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

          <option value="">
            Todas
          </option>

          {unidades.map(
            (unidade, index) => (

              <option
                key={index}
                value={unidade}
              >

                {unidade}

              </option>

            )
          )}

        </select>

      </div>

      {/* UNIDADES */}

      {Object.entries(
        unidadesFiltradas
      ).map(
        ([unidade, dados]) => (

          <div
            className="unidade-card"
            key={unidade}
          >

            {/* NOME */}

            <h2>
              {unidade}
            </h2>

            {/* RESUMO */}

            <div className="resumo-auditoria">

              <p>

                <strong>
                  Registros:
                </strong>

                {" "}

                {
                  dados.total_registros_com_inconsistencia
                }

              </p>

              <p>

                <strong>
                  Inconsistências:
                </strong>

                {" "}

                {
                  dados.total_inconsistencias
                }

              </p>

            </div>

            {/* EVOLUÇÃO DOS TEMPOS */}

            {dados.detalhes_tempos && (

              <div className="table-card">

                <h3>
                  Evolução dos Tempos
                </h3>

                <table>

                  <thead>

                    <tr>

                      <th>
                        Indicador
                      </th>

                      <th>
                        Baseline
                      </th>

                      <th>
                        Atual
                      </th>

                      <th>
                        Melhoria
                      </th>

                      <th>
                        %
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {Object.entries(
                      dados.detalhes_tempos
                    ).map(
                      ([nome, detalhe]) => (

                        <tr key={nome}>

                          <td>
                            {nome}
                          </td>

                          <td>
                            {
                              detalhe.baseline_mediana
                            }
                          </td>

                          <td>
                            {
                              detalhe.atual_mediana
                            }
                          </td>

                          <td>

                            <span
                              className={
                                detalhe.melhoria > 0
                                  ? "melhorou"
                                  : detalhe.melhoria < 0
                                  ? "piorou"
                                  : ""
                              }
                            >

                              {
                                detalhe.melhoria
                              }

                            </span>

                          </td>

                          <td>

                            <span
                              className={
                                detalhe.percentual_melhoria > 0
                                  ? "melhorou"
                                  : detalhe.percentual_melhoria < 0
                                  ? "piorou"
                                  : ""
                              }
                            >

                              {
                                detalhe.percentual_melhoria
                              }
                              %

                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

            {/* REGISTROS */}

            <div className="lista-registros">

              {dados.registros?.map(
                (
                  registro,
                  indexRegistro
                ) => (

                  <div
                    className="registro-card"
                    key={indexRegistro}
                  >

                    <h3>

                      Linha Excel:
                      {" "}
                      {
                        registro.linha_excel
                      }

                    </h3>

                    <p>

                      <strong>
                        Total:
                      </strong>

                      {" "}

                      {
                        registro.total_inconsistencias
                      }

                    </p>

                    {/* INCONSISTÊNCIAS */}

                    {registro.inconsistencias?.map(
                      (
                        inc,
                        indexInc
                      ) => (

                        <div
                          className="inconsistencia-item"
                          key={`${indexRegistro}-${indexInc}`}
                        >

                          <p>

                            <strong>
                              Tipo:
                            </strong>

                            {" "}

                            {inc.tipo}

                          </p>

                          <p>

                            <strong>
                              Campo:
                            </strong>

                            {" "}

                            {inc.campo}

                          </p>

                          <p>

                            <strong>
                              Coluna:
                            </strong>

                            {" "}

                            {inc.coluna}

                          </p>

                          {inc.valor_encontrado && (

                            <p>

                              <strong>
                                Valor:
                              </strong>

                              {" "}

                              {
                                inc.valor_encontrado
                              }

                            </p>

                          )}

                          <p>

                            <strong>
                              Regra:
                            </strong>

                            {" "}

                            {inc.regra}

                          </p>

                        </div>

                      )
                    )}

                  </div>

                )
              )}

            </div>

          </div>

        )
      )}

    </div>
  );
}

export default Auditoria;
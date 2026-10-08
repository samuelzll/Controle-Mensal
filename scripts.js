// ============================================================
// CONTROLE MENSAL
// Firebase + Dashboard + Pendências + Vencimentos + Cartão
// + Comparação + Parcelamentos + Fechamento
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyCXmDR5KJMlyz3yH-PNq8lvNAOrp8fARSg",
    authDomain: "controle-de-contas-ffd6e.firebaseapp.com",
    projectId: "controle-de-contas-ffd6e",
    storageBucket: "controle-de-contas-ffd6e.firebasestorage.app",
    messagingSenderId: "598837042980",
    appId: "1:598837042980:web:41347081f0faeac28f1db1"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();


// ============================================================
// DADOS
// ============================================================

let dados = {
    entrada: 0,
    credito: [],
    demais: [],
    faturaCartao: 0,
    devedoresCartao: [],
    fechado: false
};

let usuarioAtual = null;
let grafico = null;


// ============================================================
// FUNÇÃO AUXILIAR
// ============================================================

const $ = id => document.getElementById(id);


// ============================================================
// ELEMENTOS
// ============================================================

const mesInput = $("mes");
const entradaInput = $("entrada");

const loginBox = $("loginBox");
const appContent = $("appContent");
const authBar = $("authBar");
const userEmail = $("userEmail");

const ccDesc = $("ccDesc");
const ccValor = $("ccValor");
const ccParcela = $("ccParcela");
const ccVencimento = $("ccVencimento");

const dDesc = $("dDesc");
const dValor = $("dValor");
const dParcela = $("dParcela");
const dVencimento = $("dVencimento");

const faturaCartaoInput = $("faturaCartao");

const devedorNomeInput =
    $("devedorNome");

const devedorValorInput =
    $("devedorValor");


// ============================================================
// FORMATAÇÃO
// ============================================================

function dinheiro(valor) {

    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escapeHTML(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ============================================================
// DEFINIR MÊS ATUAL
// ============================================================

function definirMesAtual() {

    if (!mesInput.value) {

        const agora = new Date();

        const ano =
            agora.getFullYear();

        const mes =
            String(
                agora.getMonth() + 1
            ).padStart(2, "0");

        mesInput.value =
            `${ano}-${mes}`;

    }

}

definirMesAtual();


// ============================================================
// LOGIN
// ============================================================

async function login() {

    const email =
        $("email").value.trim();

    const senha =
        $("senha").value;

    if (!email || !senha) {

        alert(
            "Digite o e-mail e a senha."
        );

        return;
    }

    try {

        await auth.signInWithEmailAndPassword(
            email,
            senha
        );

    } catch (erro) {

        console.error(erro);

        alert(
            "Não foi possível entrar. Verifique o e-mail e a senha."
        );

    }

}


// ============================================================
// CRIAR CONTA
// ============================================================

async function criarConta() {

    const email =
        $("email").value.trim();

    const senha =
        $("senha").value;

    if (!email || !senha) {

        alert(
            "Digite um e-mail e uma senha."
        );

        return;
    }

    if (senha.length < 6) {

        alert(
            "A senha precisa ter pelo menos 6 caracteres."
        );

        return;
    }

    try {

        await auth.createUserWithEmailAndPassword(
            email,
            senha
        );

        alert(
            "Conta criada com sucesso!"
        );

    } catch (erro) {

        console.error(erro);

        alert(
            "Não foi possível criar a conta."
        );

    }

}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

    try {

        await auth.signOut();

    } catch (erro) {

        console.error(erro);

    }

}


// ============================================================
// AUTENTICAÇÃO
// ============================================================

auth.onAuthStateChanged(
    async user => {

        usuarioAtual =
            user;

        if (user) {

            loginBox.style.display =
                "none";

            appContent.style.display =
                "block";

            authBar.style.display =
                "flex";

            userEmail.textContent =
                user.email;

            definirMesAtual();

            await carregar();

        } else {

            loginBox.style.display =
                "flex";

            appContent.style.display =
                "none";

            authBar.style.display =
                "none";

            usuarioAtual =
                null;

        }

    }
);


// ============================================================
// REFERÊNCIA DO MÊS
// ============================================================

function referenciaMes(
    chave = mesInput.value
) {

    if (
        !usuarioAtual ||
        !chave
    ) {

        return null;

    }

    return db
        .collection("usuarios")
        .doc(usuarioAtual.uid)
        .collection("meses")
        .doc(chave);

}


// ============================================================
// NORMALIZAR ITEM
// ============================================================

function normalizarItem(item) {

    return {

        id:
            item.id ||
            `${Date.now()}-${Math.random()}`,

        desc:
            item.desc ||
            "Sem descrição",

        valor:
            Number(item.valor) || 0,

        pago:
            item.pago ?? false,

        parcelaAtual:
            Number(
                item.parcelaAtual ||
                item.parcelasAtual ||
                1
            ),

        parcelaTotal:
            Number(
                item.parcelaTotal ||
                item.parcelas ||
                1
            ),

        vencimento:
            item.vencimento ||
            ""

    };

}


// ============================================================
// NORMALIZAR DADOS
// ============================================================

function normalizarDados(
    salvo = {}
) {

    return {

        entrada:
            Number(salvo.entrada) || 0,

        credito:
            Array.isArray(
                salvo.credito
            )
                ? salvo.credito.map(
                    normalizarItem
                )
                : [],

        demais:
            Array.isArray(
                salvo.demais
            )
                ? salvo.demais.map(
                    normalizarItem
                )
                : [],

        faturaCartao:
            Number(
                salvo.faturaCartao
            ) || 0,

        devedoresCartao:
            Array.isArray(
                salvo.devedoresCartao
            )
                ? salvo.devedoresCartao.map(
                    item => ({

                        nome:
                            item.nome ||
                            "Sem nome",

                        valor:
                            Number(
                                item.valor
                            ) || 0,

                        pago:
                            item.pago ??
                            false

                    })
                )
                : [],

        fechado:
            salvo.fechado === true

    };

}


// ============================================================
// CARREGAR
// ============================================================

async function carregar() {

    if (
        !usuarioAtual ||
        !mesInput.value
    ) {

        return;

    }

    try {

        const snap =
            await referenciaMes().get();


        if (snap.exists) {

            dados =
                normalizarDados(
                    snap.data()
                );

        } else {

            dados =
                normalizarDados();

        }


        entradaInput.value =
            dados.entrada || "";


        faturaCartaoInput.value =
            dados.faturaCartao || "";


        render();

    } catch (erro) {

        console.error(
            "Erro ao carregar:",
            erro
        );

        alert(
            "Não foi possível carregar os dados deste mês."
        );

    }

}


// ============================================================
// SALVAR
// ============================================================

async function salvar() {

    if (
        !usuarioAtual ||
        !mesInput.value
    ) {

        return;

    }

    try {

        dados.entrada =
            Number(
                entradaInput.value
            ) || 0;


        dados.faturaCartao =
            Number(
                faturaCartaoInput.value
            ) || 0;


        await referenciaMes().set(
            dados
        );

    } catch (erro) {

        console.error(
            "Erro ao salvar:",
            erro
        );

        alert(
            "Não foi possível salvar os dados."
        );

    }

}


// ============================================================
// MUDANÇA DE MÊS
// ============================================================

mesInput.addEventListener(
    "change",
    async () => {

        if (usuarioAtual) {

            await carregar();

        }

    }
);


// ============================================================
// ENTRADA
// ============================================================

entradaInput.addEventListener(
    "input",
    async () => {

        if (dados.fechado) {

            return;

        }

        dados.entrada =
            Number(
                entradaInput.value
            ) || 0;


        atualizarTotais();

        await salvar();

    }
);


// ============================================================
// 7. PARCELAMENTOS MAIS INTELIGENTES
// ============================================================

function adicionarMeses(
    chaveMes,
    quantidade
) {

    const data =
        new Date(
            `${chaveMes}-01T12:00:00`
        );

    data.setMonth(
        data.getMonth() +
        quantidade
    );

    return (
        `${data.getFullYear()}-` +
        `${String(
            data.getMonth() + 1
        ).padStart(2, "0")}`
    );

}


// ============================================================
// AJUSTAR DATA DA PARCELA
// ============================================================

function ajustarDataVencimento(
    dataOriginal,
    quantidadeMeses,
    mesDestino
) {

    if (!dataOriginal) {

        return "";

    }

    const data =
        new Date(
            `${dataOriginal}T12:00:00`
        );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return "";

    }

    data.setMonth(
        data.getMonth() +
        quantidadeMeses
    );


    const ano =
        data.getFullYear();

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(2, "0");

    const dia =
        String(
            data.getDate()
        ).padStart(2, "0");


    if (
        `${ano}-${mes}` !==
        mesDestino
    ) {

        const ultimoDia =
            new Date(
                ano,
                data.getMonth() + 1,
                0
            ).getDate();


        return (
            `${ano}-${mes}-` +
            `${String(
                Math.min(
                    Number(dia),
                    ultimoDia
                )
            ).padStart(2, "0")}`
        );

    }


    return (
        `${ano}-${mes}-${dia}`
    );

}


// ============================================================
// GERAR PARCELAS
// ============================================================

async function gerarParcelas(
    tipo,
    item
) {

    const quantidade =
        Number(
            item.parcelaTotal
        ) || 1;


    if (
        quantidade <= 1 ||
        !usuarioAtual
    ) {

        return;

    }


    for (
        let parcela = 2;
        parcela <= quantidade;
        parcela++
    ) {

        const mesDestino =
            adicionarMeses(
                mesInput.value,
                parcela - 1
            );


        const refDestino =
            referenciaMes(
                mesDestino
            );


        const snap =
            await refDestino.get();


        const destino =
            snap.exists
                ? normalizarDados(
                    snap.data()
                )
                : normalizarDados();


        const lista =
            destino[tipo];


        const assinatura =
            `${item.desc}|` +
            `${Number(
                item.valor
            ).toFixed(2)}|` +
            `${parcela}|` +
            `${quantidade}`;


        const jaExiste =
            lista.some(
                x =>
                    `${x.desc}|` +
                    `${Number(
                        x.valor
                    ).toFixed(2)}|` +
                    `${Number(
                        x.parcelaAtual
                    )}|` +
                    `${Number(
                        x.parcelaTotal
                    )}` ===
                    assinatura
            );


        if (!jaExiste) {

            lista.push({

                id:
                    `${item.id}-${parcela}`,

                desc:
                    item.desc,

                valor:
                    item.valor,

                pago:
                    false,

                parcelaAtual:
                    parcela,

                parcelaTotal:
                    quantidade,

                vencimento:
                    ajustarDataVencimento(
                        item.vencimento,
                        parcela - 1,
                        mesDestino
                    )

            });


            await refDestino.set(
                destino
            );

        }

    }

}


// ============================================================
// ADICIONAR CRÉDITO
// ============================================================

async function addCredito() {

    if (dados.fechado) {

        alert(
            "O mês está fechado. Reabra o mês para alterar os lançamentos."
        );

        return;

    }


    const desc =
        ccDesc.value.trim();


    const valor =
        Number(
            ccValor.value
        ) || 0;


    const parcelas =
        Number(
            ccParcela.value
        ) || 1;


    const vencimento =
        ccVencimento.value ||
        "";


    if (!desc) {

        alert(
            "Informe a descrição da compra."
        );

        return;

    }


    if (valor <= 0) {

        alert(
            "Informe um valor válido."
        );

        return;

    }


    const item = {

        id:
            `${Date.now()}-${Math.random()}`,

        desc,

        valor,

        pago:
            false,

        parcelaAtual:
            1,

        parcelaTotal:
            parcelas,

        vencimento

    };


    dados.credito.push(
        item
    );


    ccDesc.value = "";
    ccValor.value = "";
    ccParcela.value = "1";
    ccVencimento.value = "";


    await salvar();


    await gerarParcelas(
        "credito",
        item
    );


    render();

}


// ============================================================
// ADICIONAR DEMAIS
// ============================================================

async function addDemais() {

    if (dados.fechado) {

        alert(
            "O mês está fechado. Reabra o mês para alterar os lançamentos."
        );

        return;

    }


    const desc =
        dDesc.value.trim();


    const valor =
        Number(
            dValor.value
        ) || 0;


    const parcelas =
        Number(
            dParcela.value
        ) || 1;


    const vencimento =
        dVencimento.value ||
        "";


    if (!desc) {

        alert(
            "Informe a descrição."
        );

        return;

    }


    if (valor <= 0) {

        alert(
            "Informe um valor válido."
        );

        return;

    }


    const item = {

        id:
            `${Date.now()}-${Math.random()}`,

        desc,

        valor,

        pago:
            false,

        parcelaAtual:
            1,

        parcelaTotal:
            parcelas,

        vencimento

    };


    dados.demais.push(
        item
    );


    dDesc.value = "";
    dValor.value = "";
    dParcela.value = "1";
    dVencimento.value = "";


    await salvar();


    await gerarParcelas(
        "demais",
        item
    );


    render();

}


// ============================================================
// REMOVER
// ============================================================

async function remover(tipo, index) {

    if (dados.fechado) {

        alert(
            "O mês está fechado. Reabra o mês para alterar os lançamentos."
        );

        return;
    }


    const item =
        dados[tipo][index];


    if (!item) {

        return;

    }


    const totalParcelas =
        Number(
            item.parcelaTotal
        ) || 1;


    const parcelaAtual =
        Number(
            item.parcelaAtual
        ) || 1;


    // ========================================================
    // CONTA NORMAL
    // ========================================================

    if (totalParcelas <= 1) {

        if (
            !confirm(
                "Deseja realmente remover este item?"
            )
        ) {

            return;

        }


        dados[tipo].splice(
            index,
            1
        );


        await salvar();

        render();

        return;

    }


    // ========================================================
    // CONTA PARCELADA
    // ========================================================

    const confirmar =
        confirm(

            `Esta conta possui ${totalParcelas} parcelas.\n\n` +

            `Você está excluindo a parcela ${parcelaAtual}/${totalParcelas}.\n\n` +

            `Se continuar, TODAS as parcelas desta conta serão excluídas de todos os meses.\n\n` +

            `Deseja continuar?`

        );


    if (!confirmar) {

        return;

    }


    // ========================================================
    // DESCOBRIR O ID ORIGINAL DA COMPRA
    // ========================================================

    let idBase =
        String(
            item.id || ""
        );


    /*
     * IMPORTANTE:
     *
     * A parcela 1 possui:
     *
     * ID:
     * 123456-0.123456
     *
     * A parcela 2 possui:
     *
     * ID:
     * 123456-0.123456-2
     *
     * A parcela 3:
     *
     * 123456-0.123456-3
     *
     * Portanto, se estivermos na parcela 2,
     * removemos SOMENTE "-2".
     *
     * Não usamos mais:
     *
     * replace(/-\d+$/, "")
     *
     * porque isso quebrava o ID original.
     */


    if (
        parcelaAtual > 1
    ) {

        const sufixo =
            `-${parcelaAtual}`;


        if (
            idBase.endsWith(
                sufixo
            )
        ) {

            idBase =
                idBase.slice(
                    0,
                    -sufixo.length
                );

        }

    }


    console.log(
        "ID base da compra:",
        idBase
    );


    // ========================================================
    // BUSCAR TODOS OS MESES
    // ========================================================

    try {

        const mesesRef =
            db
                .collection(
                    "usuarios"
                )
                .doc(
                    usuarioAtual.uid
                )
                .collection(
                    "meses"
                );


        const mesesSnapshot =
            await mesesRef.get();


        const batch =
            db.batch();


        let quantidadeExcluida =
            0;


        // ====================================================
        // PERCORRER TODOS OS MESES
        // ====================================================

        mesesSnapshot.forEach(
            doc => {

                const mesDados =
                    normalizarDados(
                        doc.data()
                    );


                const listaOriginal =
                    Array.isArray(
                        mesDados[tipo]
                    )

                        ? mesDados[tipo]

                        : [];


                const listaNova =
                    listaOriginal.filter(
                        parcela => {

                            const parcelaId =
                                String(
                                    parcela.id || ""
                                );


                            /*
                             * Remove somente os IDs
                             * pertencentes a esta compra.
                             *
                             * Exemplo:
                             *
                             * idBase:
                             * 123-0.456
                             *
                             * Remove:
                             *
                             * 123-0.456
                             * 123-0.456-2
                             * 123-0.456-3
                             * 123-0.456-4
                             *
                             * Mas NÃO remove:
                             *
                             * 123-0.4567
                             * 999-0.456
                             */


                            const pertenceAoParcelamento =
                                parcelaId === idBase ||
                                parcelaId.startsWith(
                                    `${idBase}-`
                                );


                            if (
                                pertenceAoParcelamento
                            ) {

                                quantidadeExcluida++;

                                return false;

                            }


                            return true;

                        }
                    );


                // Só atualiza o mês se encontrou
                // alguma parcela nele.

                if (
                    listaNova.length !==
                    listaOriginal.length
                ) {

                    batch.update(
                        doc.ref,
                        {

                            [tipo]:
                                listaNova

                        }
                    );

                }

            }
        );


        // ====================================================
        // EXECUTAR TODAS AS EXCLUSÕES
        // ====================================================

        if (
            quantidadeExcluida > 0
        ) {

            await batch.commit();

        }


        // ====================================================
        // RECARREGAR MÊS ATUAL
        // ====================================================

        await carregar();


        render();


        alert(

            `A conta foi excluída com sucesso.\n\n` +

            `${quantidadeExcluida} parcela(s) foram removidas de todos os meses.`

        );


    } catch (erro) {

        console.error(
            "Erro ao excluir parcelamento:",
            erro
        );


        alert(

            "Não foi possível excluir todas as parcelas.\n\n" +

            "Verifique sua conexão e tente novamente."

        );

    }

}

// ============================================================
// EDITAR
// ============================================================

async function editar(
    tipo,
    index
) {

    if (dados.fechado) {

        alert(
            "O mês está fechado. Reabra o mês para alterar os lançamentos."
        );

        return;

    }


    const item =
        dados[tipo][index];


    const novaDescricao =
        prompt(
            "Descrição:",
            item.desc
        );


    if (
        novaDescricao === null
    ) {

        return;

    }


    const novoValor =
        prompt(
            "Valor:",
            item.valor
        );


    if (
        novoValor === null
    ) {

        return;

    }


    const valor =
        Number(
            novoValor
        );


    if (
        !novaDescricao.trim() ||
        valor <= 0
    ) {

        alert(
            "Dados inválidos."
        );

        return;

    }


    item.desc =
        novaDescricao.trim();


    item.valor =
        valor;


    await salvar();

    render();

}


// ============================================================
// PAGO / PENDENTE
// ============================================================

async function alternarPago(
    tipo,
    index
) {

    if (dados.fechado) {

        alert(
            "O mês está fechado. Reabra o mês para alterar os lançamentos."
        );

        return;

    }


    dados[tipo][index].pago =
        !dados[tipo][index].pago;


    await salvar();

    render();

}


// ============================================================
// STATUS DO VENCIMENTO
// ============================================================

function statusVencimento(
    data
) {

    if (!data) {

        return {
            classe: "",
            texto: "Sem vencimento"
        };

    }


    const hoje =
        new Date();


    hoje.setHours(
        0,
        0,
        0,
        0
    );


    const venc =
        new Date(
            `${data}T00:00:00`
        );


    venc.setHours(
        0,
        0,
        0,
        0
    );


    const diferenca =
        Math.round(
            (
                venc - hoje
            ) / 86400000
        );


    if (diferenca < 0) {

        return {

            classe:
                "overdue",

            texto:
                `Vencida há ${Math.abs(diferenca)} dia(s)`

        };

    }


    if (diferenca === 0) {

        return {

            classe:
                "today",

            texto:
                "Vence hoje"

        };

    }


    if (diferenca <= 7) {

        return {

            classe:
                "soon",

            texto:
                `Vence em ${diferenca} dia(s)`

        };

    }


    return {

        classe: "",

        texto:
            "Agendada"

    };

}


// ============================================================
// FORMATAR DATA
// ============================================================

function formatarData(
    data
) {

    if (!data) {

        return "Sem data";

    }


    const partes =
        data.split("-");


    if (
        partes.length !== 3
    ) {

        return data;

    }


    return (
        `${partes[2]}/` +
        `${partes[1]}/` +
        `${partes[0]}`
    );

}


// ============================================================
// RENDERIZAR LISTAS
// ============================================================

function renderLista(
    tipo,
    elementoId
) {

    const elemento =
        $(elementoId);


    elemento.innerHTML =
        "";


    if (
        !dados[tipo].length
    ) {

        elemento.innerHTML =
            `<div class="empty">
                Nenhuma despesa cadastrada.
            </div>`;

        return;

    }


    dados[tipo].forEach(
        (item, index) => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                `item ${
                    item.pago
                        ? "pago"
                        : ""
                }`;


            const parcelaTexto =
                Number(
                    item.parcelaTotal
                ) > 1

                    ? ` (${item.parcelaAtual || 1}/${item.parcelaTotal})`

                    : "";


            const vencimento =
                item.vencimento

                    ? `Vencimento: ${formatarData(item.vencimento)}`

                    : "";


            div.innerHTML = `

                <div class="info">

                    <span class="titulo">

                        ${escapeHTML(
                            item.desc
                        )}

                        ${parcelaTexto}

                    </span>


                    <span class="valor">

                        ${dinheiro(
                            item.valor
                        )}

                    </span>


                    ${
                        vencimento
                            ? `
                                <span class="pendingMeta">
                                    ${vencimento}
                                </span>
                            `
                            : ""
                    }

                </div>


                <div class="acoes">

                    <button
                        class="${
                            item.pago
                                ? "btnPago"
                                : "btnPendente"
                        }"
                        onclick="alternarPago(
                            '${tipo}',
                            ${index}
                        )"
                    >

                        ${
                            item.pago
                                ? "Pago"
                                : "Pendente"
                        }

                    </button>


                    <button
                        onclick="editar(
                            '${tipo}',
                            ${index}
                        )"
                    >
                        Editar
                    </button>


                    <button
                        onclick="remover(
                            '${tipo}',
                            ${index}
                        )"
                    >
                        Excluir
                    </button>

                </div>

            `;


            elemento.appendChild(
                div
            );

        }
    );

}


// ============================================================
// CARTÃO - ADICIONAR DEVEDOR
// ============================================================

async function addDevedorCartao() {

    if (dados.fechado) {

        alert(
            "O mês está fechado. Reabra o mês para alterar os lançamentos."
        );

        return;

    }


    const nome =
        devedorNomeInput.value.trim();


    const valor =
        Number(
            devedorValorInput.value
        ) || 0;


    if (!nome) {

        alert(
            "Informe o nome da pessoa."
        );

        return;

    }


    if (valor <= 0) {

        alert(
            "Informe um valor válido."
        );

        return;

    }


    dados.devedoresCartao.push({

        nome,

        valor,

        pago:
            false

    });


    devedorNomeInput.value =
        "";


    devedorValorInput.value =
        "";


    await salvar();

    render();

}


// ============================================================
// CARTÃO - PAGO
// ============================================================

async function alternarPagoDevedorCartao(
    index
) {

    if (dados.fechado) {

        alert(
            "O mês está fechado. Reabra o mês para alterar os lançamentos."
        );

        return;

    }


    if (
        !dados.devedoresCartao[index]
    ) {

        return;

    }


    dados.devedoresCartao[index].pago =
        !dados.devedoresCartao[index].pago;


    await salvar();

    render();

}


// ============================================================
// CARTÃO - REMOVER DEVEDOR
// ============================================================

async function removerDevedorCartao(
    index
) {

    if (dados.fechado) {

        alert(
            "O mês está fechado. Reabra o mês para alterar os lançamentos."
        );

        return;

    }


    if (
        !confirm(
            "Deseja remover esta pessoa?"
        )
    ) {

        return;

    }


    dados.devedoresCartao.splice(
        index,
        1
    );


    await salvar();

    render();

}


// ============================================================
// CARTÃO - EDITAR DEVEDOR
// ============================================================

async function editarDevedorCartao(
    index
) {

    if (dados.fechado) {

        alert(
            "O mês está fechado. Reabra o mês para alterar os lançamentos."
        );

        return;

    }


    const item =
        dados.devedoresCartao[index];


    const novoNome =
        prompt(
            "Nome:",
            item.nome
        );


    if (
        novoNome === null
    ) {

        return;

    }


    const novoValor =
        prompt(
            "Valor:",
            item.valor
        );


    if (
        novoValor === null
    ) {

        return;

    }


    const valor =
        Number(
            novoValor
        );


    if (
        !novoNome.trim() ||
        valor <= 0
    ) {

        alert(
            "Informe dados válidos."
        );

        return;

    }


    item.nome =
        novoNome.trim();


    item.valor =
        valor;


    await salvar();

    render();

}


// ============================================================
// RENDERIZAR DEVEDORES
// ============================================================

function renderDevedoresCartao() {

    const lista =
        $("listaDevedoresCartao");


    lista.innerHTML =
        "";


    if (
        !dados.devedoresCartao.length
    ) {

        lista.innerHTML =
            `<div class="empty">
                Nenhuma pessoa cadastrada.
            </div>`;

        return;

    }


    dados.devedoresCartao.forEach(
        (item, index) => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "devedorItem";


            div.innerHTML = `

                <div class="devedorInfo">

                    <strong>

                        ${escapeHTML(
                            item.nome
                        )}

                    </strong>


                    <span>

                        ${dinheiro(
                            item.valor
                        )}

                        ${
                            item.pago
                                ? " • Pago"
                                : " • A receber"
                        }

                    </span>

                </div>


                <div class="devedorAcoes">

                    <button
                        class="${
                            item.pago
                                ? "btnPago"
                                : "btnPendente"
                        }"
                        onclick="
                            alternarPagoDevedorCartao(
                                ${index}
                            )
                        "
                    >

                        ${
                            item.pago
                                ? "Pago"
                                : "Pendente"
                        }

                    </button>


                    <button
                        onclick="
                            editarDevedorCartao(
                                ${index}
                            )
                        "
                    >
                        Editar
                    </button>


                    <button
                        onclick="
                            removerDevedorCartao(
                                ${index}
                            )
                        "
                    >
                        Excluir
                    </button>

                </div>

            `;


            lista.appendChild(
                div
            );

        }
    );

}


// ============================================================
// SALVAR FATURA
// ============================================================

async function salvarFaturaCartao() {

    if (dados.fechado) {

        return;

    }


    dados.faturaCartao =
        Number(
            faturaCartaoInput.value
        ) || 0;


    await salvar();

    render();

}


faturaCartaoInput.addEventListener(
    "change",
    salvarFaturaCartao
);


// ============================================================
// 6. CONTROLE MELHOR DO CARTÃO
// ============================================================

function atualizarConferenciaFatura() {

    const fatura =
        Number(
            dados.faturaCartao
        ) || 0;


    const totalDevedores =
        dados.devedoresCartao.reduce(
            (
                total,
                item
            ) =>

                total +
                Number(
                    item.valor
                ) || 0,

            0
        );


    const recebido =
        dados.devedoresCartao
            .filter(
                item =>
                    item.pago
            )
            .reduce(
                (
                    total,
                    item
                ) =>

                    total +
                    Number(
                        item.valor
                    ) || 0,

                0
            );


    const aReceber =
        Math.max(
            totalDevedores -
            recebido,
            0
        );


    const minhaParte =
        Math.max(
            fatura -
            totalDevedores,
            0
        );


    const totalConferido =
        minhaParte +
        totalDevedores;


    const diferenca =
        fatura -
        totalConferido;


    $("faturaResumo").textContent =
        dinheiro(fatura);


    $("totalDevedores").textContent =
        dinheiro(
            totalDevedores
        );


    $("parteUsuario").textContent =
        dinheiro(
            minhaParte
        );


    $("conferidoFatura").textContent =
        dinheiro(
            totalConferido
        );


    const status =
        $("statusFatura");


    if (fatura <= 0) {

        status.className =
            "statusFatura neutro";


        status.innerHTML =
            "Informe o valor da fatura para fazer a conferência.";


        return;

    }


    if (
        totalDevedores >
        fatura
    ) {

        status.className =
            "statusFatura erro";


        status.innerHTML = `

            🔴 <strong>Atenção:</strong>

            os valores de terceiros
            (${dinheiro(totalDevedores)})
            ultrapassam a fatura
            (${dinheiro(fatura)}).

        `;


        return;

    }


    if (
        Math.abs(
            diferenca
        ) < 0.01
    ) {

        status.className =
            "statusFatura sucesso";


        status.innerHTML = `

            🟢 <strong>Fatura conferida!</strong>

            Terceiros:
            ${dinheiro(totalDevedores)}.

            Sua parte:
            ${dinheiro(minhaParte)}.

            Recebido:
            ${dinheiro(recebido)}.

            A receber:
            ${dinheiro(aReceber)}.

        `;


        return;

    }


    status.className =
        "statusFatura aviso";


    status.innerHTML = `

        🟠 <strong>Conferência realizada.</strong>

        Terceiros:
        ${dinheiro(totalDevedores)}.

        Sua parte:
        ${dinheiro(minhaParte)}.

        A receber:
        ${dinheiro(aReceber)}.

    `;

}


// ============================================================
// 2. RESUMO DE CONTAS PENDENTES
// ============================================================

function obterTodasDespesas() {

    return [

        ...dados.credito.map(
            (
                item,
                index
            ) => ({

                ...item,

                tipo:
                    "credito",

                index

            })
        ),

        ...dados.demais.map(
            (
                item,
                index
            ) => ({

                ...item,

                tipo:
                    "demais",

                index

            })
        )

    ];

}


// ============================================================
// ATUALIZAR PENDENTES
// ============================================================

function atualizarPendentes() {

    const lista =
        $("listaPendentes");


    const despesas =
        obterTodasDespesas()
            .filter(
                item =>
                    !item.pago
            );


    lista.innerHTML =
        "";


    if (
        !despesas.length
    ) {

        lista.innerHTML = `

            <div class="empty">

                🎉 Não há contas
                pendentes neste mês.

            </div>

        `;


        $("pendingTotal").textContent =
            dinheiro(0);


        return;

    }


    let total = 0;


    despesas.sort(
        (
            a,
            b
        ) =>

            (
                a.vencimento ||
                "9999"
            ).localeCompare(
                b.vencimento ||
                "9999"
            )

    );


    despesas.forEach(
        item => {

            total +=
                Number(
                    item.valor
                ) || 0;


            const status =
                statusVencimento(
                    item.vencimento
                );


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                `pendingItem ${
                    status.classe
                }`;


            div.innerHTML = `

                <div>

                    <strong>

                        ${escapeHTML(
                            item.desc
                        )}

                    </strong>


                    <span>

                        ${
                            item.vencimento
                                ? formatarData(
                                    item.vencimento
                                )
                                : "Sem vencimento"
                        }

                        •

                        ${status.texto}

                    </span>

                </div>


                <div class="pending-value">

                    ${dinheiro(
                        item.valor
                    )}

                </div>

            `;


            lista.appendChild(
                div
            );

        }
    );


    $("pendingTotal").textContent =
        dinheiro(total);

}


// ============================================================
// 3. VENCIMENTO DAS DESPESAS
// ============================================================

function atualizarVencimentos() {

    const lista =
        $("listaVencimentos");


    const despesas =
        obterTodasDespesas()
            .filter(
                item =>
                    item.vencimento
            );


    lista.innerHTML =
        "";


    if (
        !despesas.length
    ) {

        lista.innerHTML = `

            <div class="empty">

                Cadastre uma data de vencimento
                para acompanhar suas despesas.

            </div>

        `;


        return;

    }


    despesas.sort(
        (
            a,
            b
        ) =>
            a.vencimento.localeCompare(
                b.vencimento
            )
    );


    despesas.forEach(
        item => {

            const status =
                statusVencimento(
                    item.vencimento
                );


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                `vencimento-item ${
                    status.classe
                }`;


            div.innerHTML = `

                <div class="vencimento-desc">

                    ${escapeHTML(
                        item.desc
                    )}

                </div>


                <div class="vencimento-data">

                    ${formatarData(
                        item.vencimento
                    )}

                </div>


                <div class="vencimento-status">

                    ${
                        item.pago
                            ? "Pago"
                            : status.texto
                    }

                </div>

            `;


            lista.appendChild(
                div
            );

        }
    );

}


// ============================================================
// 1. DASHBOARD DO MÊS
// ============================================================

function atualizarDashboard() {

    const despesas =
        obterTodasDespesas();


    const pendentes =
        despesas.filter(
            item =>
                !item.pago
        );


    const entrada =
        Number(
            dados.entrada
        ) || 0;


    const total =
        despesas.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.valor
                ) || 0,

            0
        );


    const percentual =
        entrada > 0

            ? (
                total /
                entrada
            ) * 100

            : 0;


    $("percentualDashboard").textContent =
        `${percentual.toFixed(1)}%`;


    $("quantidadePendentes").textContent =
        String(
            pendentes.length
        );


    const proximos =
        despesas
            .filter(
                item =>
                    !item.pago &&
                    item.vencimento
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.vencimento.localeCompare(
                        b.vencimento
                    )
            );


    $("proximoVencimento").textContent =
        proximos.length

            ? formatarData(
                proximos[0].vencimento
            )

            : "Nenhum";

}


// ============================================================
// 5. COMPARAÇÃO ENTRE MESES
// ============================================================

async function carregarMesParaComparacao(
    chave
) {

    const ref =
        referenciaMes(
            chave
        );


    if (!ref) {

        return normalizarDados();

    }


    try {

        const snap =
            await ref.get();


        return snap.exists

            ? normalizarDados(
                snap.data()
            )

            : normalizarDados();

    } catch (erro) {

        console.error(
            "Erro na comparação:",
            erro
        );


        return normalizarDados();

    }

}


// ============================================================
// RESUMO DE UM MÊS
// ============================================================

function resumoMes(
    mes
) {

    const despesas = [
        ...mes.credito,
        ...mes.demais
    ];


    const total =
        despesas.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.valor
                ) || 0,

            0
        );


    const pago =
        despesas
            .filter(
                item =>
                    item.pago
            )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.valor
                    ) || 0,

                0
            );


    const pendente =
        total -
        pago;


    return {

        entrada:
            Number(
                mes.entrada
            ) || 0,

        total,

        pago,

        pendente,

        saldo:
            (
                Number(
                    mes.entrada
                ) || 0
            ) -
            total

    };

}


// ============================================================
// DIFERENÇA
// ============================================================

function diferencaTexto(
    atual,
    anterior,
    inverter = false
) {

    if (
        anterior === 0 &&
        atual === 0
    ) {

        return {

            classe:
                "compare-neutral",

            texto:
                "Sem alteração"

        };

    }


    if (
        anterior === 0
    ) {

        return {

            classe:
                inverter
                    ? "compare-down"
                    : "compare-up",

            texto:
                "Novo valor"

        };

    }


    const percentual =
        (
            (
                atual -
                anterior
            ) /
            Math.abs(
                anterior
            )
        ) * 100;


    if (
        Math.abs(
            percentual
        ) < 0.05
    ) {

        return {

            classe:
                "compare-neutral",

            texto:
                "Praticamente igual"

        };

    }


    const aumentou =
        percentual > 0;


    const ruim =
        inverter
            ? !aumentou
            : aumentou;


    return {

        classe:
            ruim
                ? "compare-up"
                : "compare-down",

        texto:
            `${aumentou ? "↑" : "↓"} ` +
            `${Math.abs(
                percentual
            ).toFixed(1)}%`

    };

}


// ============================================================
// ATUALIZAR COMPARAÇÃO
// ============================================================

async function atualizarComparacao() {

    const container =
        $("comparacaoMeses");


    const mesAtual =
        mesInput.value;


    const anterior =
        adicionarMeses(
            mesAtual,
            -1
        );


    const doisAtras =
        adicionarMeses(
            mesAtual,
            -2
        );


    const [
        dadosAnterior,
        dadosDoisAtras
    ] = await Promise.all([

        carregarMesParaComparacao(
            anterior
        ),

        carregarMesParaComparacao(
            doisAtras
        )

    ]);


    const atual =
        resumoMes(
            dados
        );


    const ant =
        resumoMes(
            dadosAnterior
        );


    const ant2 =
        resumoMes(
            dadosDoisAtras
        );


    const cards = [

        [
            "Despesas",
            atual.total,
            ant.total,
            false
        ],

        [
            "Entrada",
            atual.entrada,
            ant.entrada,
            true
        ],

        [
            "Saldo",
            atual.saldo,
            ant.saldo,
            true
        ],

        [
            "Pago",
            atual.pago,
            ant.pago,
            true
        ],

        [
            "Pendente",
            atual.pendente,
            ant.pendente,
            false
        ],

        [
            "Despesas há 2 meses",
            ant2.total,
            0,
            false
        ]

    ];


    container.innerHTML =
        cards.map(
            (
                [
                    titulo,
                    valor,
                    comparado,
                    inverter
                ]
            ) => {

                const dif =
                    diferencaTexto(
                        valor,
                        comparado,
                        inverter
                    );


                return `

                    <div class="compare-card">

                        <span>
                            ${titulo}
                        </span>


                        <strong>
                            ${dinheiro(
                                valor
                            )}
                        </strong>


                        <small
                            class="${dif.classe}"
                        >
                            ${dif.texto}
                        </small>

                    </div>

                `;

            }
        ).join("");

}


// ============================================================
// 10. FECHAMENTO DO MÊS
// ============================================================

function atualizarFechamento() {

    const despesas =
        obterTodasDespesas();


    const total =
        despesas.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.valor
                ) || 0,

            0
        );


    const pago =
        despesas
            .filter(
                item =>
                    item.pago
            )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.valor
                    ) || 0,

                0
            );


    const saldo =
        (
            Number(
                dados.entrada
            ) || 0
        ) -
        total;


    $("fechamentoResumo").innerHTML = `

        <div class="summary-box">

            <span>
                Entrada
            </span>

            <strong>
                ${dinheiro(
                    dados.entrada
                )}
            </strong>

        </div>


        <div class="summary-box">

            <span>
                Despesas
            </span>

            <strong>
                ${dinheiro(
                    total
                )}
            </strong>

        </div>


        <div class="summary-box">

            <span>
                Pago
            </span>

            <strong>
                ${dinheiro(
                    pago
                )}
            </strong>

        </div>


        <div class="summary-box">

            <span>
                Saldo
            </span>

            <strong>
                ${dinheiro(
                    saldo
                )}
            </strong>

        </div>

    `;


    $("closedBanner").style.display =
        dados.fechado
            ? "block"
            : "none";


    $("btnFecharMes").style.display =
        dados.fechado
            ? "none"
            : "inline-block";


    $("btnReabrirMes").style.display =
        dados.fechado
            ? "inline-block"
            : "none";


    const campos = [

        entradaInput,

        faturaCartaoInput,

        ccDesc,

        ccValor,

        ccParcela,

        ccVencimento,

        dDesc,

        dValor,

        dParcela,

        dVencimento,

        devedorNomeInput,

        devedorValorInput

    ];


    campos.forEach(
        campo => {

            if (campo) {

                campo.disabled =
                    dados.fechado;

            }

        }
    );

}


// ============================================================
// FECHAR MÊS
// ============================================================

async function fecharMes() {

    if (dados.fechado) {

        return;

    }


    const pendentes =
        obterTodasDespesas()
            .filter(
                item =>
                    !item.pago
            );


    const mensagem =
        pendentes.length

            ? `Ainda existem ${pendentes.length} conta(s) pendente(s). Deseja fechar mesmo assim?`

            : "Deseja fechar este mês? Depois do fechamento, os lançamentos ficarão bloqueados.";


    if (
        !confirm(
            mensagem
        )
    ) {

        return;

    }


    dados.fechado =
        true;


    await salvar();

    render();

}


// ============================================================
// REABRIR MÊS
// ============================================================

async function reabrirMes() {

    if (!dados.fechado) {

        return;

    }


    if (
        !confirm(
            "Deseja reabrir este mês para fazer alterações?"
        )
    ) {

        return;

    }


    dados.fechado =
        false;


    await salvar();

    render();

}


// ============================================================
// TOTAIS
// ============================================================

function atualizarTotais() {

    const totalCredito =
        dados.credito.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.valor
                ) || 0,

            0
        );


    const totalDemais =
        dados.demais.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.valor
                ) || 0,

            0
        );


    const totalPago =
        [
            ...dados.credito,
            ...dados.demais
        ]
            .filter(
                item =>
                    item.pago
            )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.valor
                    ) || 0,

                0
            );


    const totalDespesas =
        totalCredito +
        totalDemais;


    const totalPendente =
        totalDespesas -
        totalPago;


    const saldo =
        (
            Number(
                dados.entrada
            ) || 0
        ) -
        totalDespesas;


    const entrada =
        Number(
            dados.entrada
        ) || 0;


    const percentual =
        entrada > 0

            ? (
                totalDespesas /
                entrada
            ) * 100

            : 0;


    $("cardEntrada").textContent =
        dinheiro(
            dados.entrada
        );


    $("cardCredito").textContent =
        dinheiro(
            totalCredito
        );


    $("cardDemais").textContent =
        dinheiro(
            totalDemais
        );


    $("cardPago").textContent =
        dinheiro(
            totalPago
        );


    $("cardPendente").textContent =
        dinheiro(
            totalPendente
        );


    $("cardSaldo").textContent =
        dinheiro(
            saldo
        );


    $("totalCredito").textContent =
        dinheiro(
            totalCredito
        );


    $("totalDemais").textContent =
        dinheiro(
            totalDemais
        );


    $("totalDespesas").textContent =
        dinheiro(
            totalDespesas
        );


    $("saldoFinal").textContent =
        dinheiro(
            saldo
        );


    $("percentualUso").textContent =
        `${percentual.toFixed(1)}%`;


    $("barraUso").style.width =
        `${Math.min(
            Math.max(
                percentual,
                0
            ),
            100
        )}%`;


    $("textoProgresso").textContent =
        `${dinheiro(
            totalDespesas
        )} de ${dinheiro(
            entrada
        )}`;


    atualizarGrafico(
        totalCredito,
        totalDemais,
        totalPago,
        totalPendente
    );

}


// ============================================================
// GRÁFICO
// ============================================================

function atualizarGrafico(
    totalCredito,
    totalDemais,
    totalPago,
    totalPendente
) {

    const canvas =
        $("graficoMensal");


    if (
        !canvas ||
        typeof Chart ===
            "undefined"
    ) {

        return;

    }


    if (grafico) {

        grafico.destroy();

    }


    grafico =
        new Chart(
            canvas.getContext(
                "2d"
            ),
            {

                type:
                    "doughnut",


                data: {

                    labels: [

                        "Cartão",

                        "Outros",

                        "Pago",

                        "Pendente"

                    ],


                    datasets: [

                        {

                            data: [

                                totalCredito,

                                totalDemais,

                                totalPago,

                                totalPendente

                            ]

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            labels: {

                                color:
                                    "#fff"

                            }

                        }

                    }

                }

            }
        );

}


// ============================================================
// RENDER PRINCIPAL
// ============================================================

function render() {

    renderLista(
        "credito",
        "listaCredito"
    );


    renderLista(
        "demais",
        "listaDemais"
    );


    renderDevedoresCartao();


    atualizarTotais();


    atualizarConferenciaFatura();


    atualizarPendentes();


    atualizarVencimentos();


    atualizarDashboard();


    atualizarFechamento();


    atualizarComparacao();

}


// ============================================================
// EXPORTAR TXT
// ============================================================

function exportarTXT() {

    let texto =
        "CONTROLE MENSAL\n";


    texto +=
        "============================\n\n";


    texto +=
        `Mês: ${mesInput.value}\n`;


    texto +=
        `Entrada: ${dinheiro(
            dados.entrada
        )}\n`;


    texto +=
        `Status: ${
            dados.fechado
                ? "Fechado"
                : "Aberto"
        }\n\n`;


    texto +=
        "CARTÃO DE CRÉDITO\n";


    texto +=
        "----------------------------\n";


    dados.credito.forEach(
        item => {

            const parcela =
                Number(
                    item.parcelaTotal
                ) > 1

                    ? ` (${item.parcelaAtual}/${item.parcelaTotal})`

                    : "";


            texto +=
                `${item.desc}${parcela} - ` +
                `${dinheiro(item.valor)} - ` +
                `${item.pago
                    ? "Pago"
                    : "Pendente"}`;


            if (
                item.vencimento
            ) {

                texto +=
                    ` - Vencimento: ` +
                    `${formatarData(
                        item.vencimento
                    )}`;

            }


            texto +=
                "\n";

        }
    );


    texto +=
        "\nDEMAIS DESPESAS\n";


    texto +=
        "----------------------------\n";


    dados.demais.forEach(
        item => {

            const parcela =
                Number(
                    item.parcelaTotal
                ) > 1

                    ? ` (${item.parcelaAtual}/${item.parcelaTotal})`

                    : "";


            texto +=
                `${item.desc}${parcela} - ` +
                `${dinheiro(item.valor)} - ` +
                `${item.pago
                    ? "Pago"
                    : "Pendente"}`;


            if (
                item.vencimento
            ) {

                texto +=
                    ` - Vencimento: ` +
                    `${formatarData(
                        item.vencimento
                    )}`;

            }


            texto +=
                "\n";

        }
    );


    texto +=
        "\nCARTÃO - TERCEIROS\n";


    texto +=
        "----------------------------\n";


    dados.devedoresCartao.forEach(
        item => {

            texto +=
                `${item.nome} - ` +
                `${dinheiro(
                    item.valor
                )} - ` +
                `${item.pago
                    ? "Pago"
                    : "A receber"}\n`;

        }
    );


    baixarArquivo(
        texto,
        `controle-${mesInput.value}.txt`,
        "text/plain;charset=utf-8"
    );

}


// ============================================================
// EXPORTAR CSV
// ============================================================

function exportarCSV() {

    const linhas = [

        [
            "Tipo",
            "Descrição",
            "Valor",
            "Status",
            "Parcela",
            "Vencimento"
        ]

    ];


    dados.credito.forEach(
        item => {

            linhas.push([

                "Cartão",

                item.desc,

                Number(
                    item.valor || 0
                )
                    .toFixed(2)
                    .replace(
                        ".",
                        ","
                    ),

                item.pago
                    ? "Pago"
                    : "Pendente",

                Number(
                    item.parcelaTotal
                ) > 1

                    ? `${item.parcelaAtual}/${item.parcelaTotal}`

                    : "",

                item.vencimento
                    ? formatarData(
                        item.vencimento
                    )
                    : ""

            ]);

        }
    );


    dados.demais.forEach(
        item => {

            linhas.push([

                "Demais",

                item.desc,

                Number(
                    item.valor || 0
                )
                    .toFixed(2)
                    .replace(
                        ".",
                        ","
                    ),

                item.pago
                    ? "Pago"
                    : "Pendente",

                Number(
                    item.parcelaTotal
                ) > 1

                    ? `${item.parcelaAtual}/${item.parcelaTotal}`

                    : "",

                item.vencimento
                    ? formatarData(
                        item.vencimento
                    )
                    : ""

            ]);

        }
    );


    dados.devedoresCartao.forEach(
        item => {

            linhas.push([

                "Devedor cartão",

                item.nome,

                Number(
                    item.valor || 0
                )
                    .toFixed(2)
                    .replace(
                        ".",
                        ","
                    ),

                item.pago
                    ? "Pago"
                    : "A receber",

                "",

                ""

            ]);

        }
    );


    const csv =
        linhas
            .map(
                linha =>

                    linha
                        .map(
                            campo =>

                                `"${String(
                                    campo ?? ""
                                ).replaceAll(
                                    '"',
                                    '""'
                                )}"`
                        )
                        .join(";")
            )
            .join("\n");


    baixarArquivo(
        "\ufeff" + csv,
        `controle-${mesInput.value}.csv`,
        "text/csv;charset=utf-8"
    );

}


// ============================================================
// DOWNLOAD
// ============================================================

function baixarArquivo(
    conteudo,
    nome,
    tipo
) {

    const blob =
        new Blob(
            [conteudo],
            {
                type: tipo
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement(
            "a"
        );


    a.href =
        url;


    a.download =
        nome;


    document.body.appendChild(
        a
    );


    a.click();


    a.remove();


    URL.revokeObjectURL(
        url
    );

}
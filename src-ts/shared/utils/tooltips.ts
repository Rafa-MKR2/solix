// SPDX-License-Identifier: MIT

/**
 * Dicionário de tooltips educativos (ⓘ).
 * Conteúdo em PT-BR simples, voltado a usuários iniciantes.
 * Cada chave corresponde ao atributo `data-help` dos gatilhos `.help-tip`.
 */
export const tooltips: Record<string, string> = {
  'section-distribuicao': 'Aqui você vê qual versão do Linux está usando. É como saber o modelo e a versão do sistema operacional do seu computador.',
  'section-hardware': 'Informações sobre as peças físicas do seu computador: processador, memória, placa de vídeo e outros componentes. Tudo que está dentro do gabinete!',
  'section-visao-geral': 'Um resumo rápido do estado do seu sistema: quantos programas estão instalados, se há atualizações disponíveis e como estão os recursos do computador.',
  'section-desempenho': 'Mostra em tempo real o desempenho do seu computador: uso do processador, memória e temperatura. Os gráficos são atualizados automaticamente a cada 3 segundos.',
  'section-processos': 'Lista de todos os programas e serviços rodando no seu computador agora. Se algo estiver lento, você pode identificar qual programa está consumindo muitos recursos.',
  'section-discos': 'Seus discos e partições. Mostra quanto espaço está ocupado e livre, o tipo de cada disco (ext4, btrfs, NTFS), e permite abrir pastas ou analisar o uso.',
  'section-ferramentas': 'Lista de programas úteis que você pode instalar com um clique. Basta selecionar os que deseja e clicar em "Instalar Selecionadas".',
  'section-rede': 'Informações sobre sua conexão com a internet, Wi-Fi, Bluetooth e bateria do notebook. Tudo que conecta seu computador ao mundo.',
  'cpu': 'O processador, ou "cérebro" do computador. Ele executa todos os cálculos. Quanto maior a porcentagem, mais ele está trabalhando. Entre 0-30% é uso normal.',
  'ram': 'A memória RAM é a memória de trabalho do computador. Os programas ficam nela enquanto estão abertos. Se ficar muito cheia (acima de 90%), o sistema pode ficar lento.',
  'temp': 'A temperatura do processador. Entre 30°C e 70°C é normal. Acima de 80°C merece atenção — pode ser hora de limpar o cooler ou trocar a pasta térmica.',
  'nucleos': 'Os núcleos do processador. Imagine cada núcleo como um "trabalhador": quanto mais núcleos, mais tarefas o computador consegue realizar ao mesmo tempo.',
  'kernel': 'O núcleo do Linux, a parte mais fundamental do sistema operacional. É como o "motor" do seu computador — essencial para tudo funcionar.',
  'gpu': 'Placa de vídeo (GPU). Responsável por mostrar imagens na tela. Importante para jogos, vídeos, edição de imagem e para o sistema ficar bonito e fluido.',
  'uptime': 'Há quanto tempo o computador está ligado sem desligar ou reiniciar. Se estiver com muitos dias ligado, uma reinicializada pode ajudar o desempenho.',
  'pacotes': 'Quantidade total de programas instalados no seu sistema. Isso inclui navegador, editor de texto, jogos e também componentes internos que fazem tudo funcionar.',
  'atualizacoes': 'Novas versões dos seus programas disponíveis para instalar. Manter tudo atualizado é importante para a segurança e para ter as últimas melhorias e correções.',
  'carga': 'Média de processos esperando o processador. São 3 números: do último minuto, dos últimos 5 e dos últimos 15 minutos. Números baixos = sistema tranquilo e rápido.',
  'swap': 'Uma área do disco que o sistema usa como "memória extra" quando a RAM está cheia. É mais lenta que a RAM, mas evita que o computador trave quando falta memória.',
  'servicos': 'Programas essenciais rodando em segundo plano, como som, rede, impressão e atualizações. Eles fazem tudo funcionar sem você precisar se preocupar.',
  'zram': 'Técnica que compacta parte da memória RAM para evitar lentidão quando o computador está com pouca memória. Recomendado para máquinas com 4GB ou menos de RAM.',
  'limpeza': 'Remove arquivos temporários, cache de programas e pacotes antigos. Libera espaço no disco e ajuda o sistema a ficar mais leve. É seguro fazer de vez em quando!',
  'atualizar-sistema': 'Baixa e instala as últimas atualizações de segurança e melhorias para todos os seus programas. Recomendado fazer sempre que aparecerem atualizações disponíveis.',
  'reportar': 'Se algo não funcionar como esperado, este botão gera um relatório automático do seu sistema e abre uma página para você reportar o problema no GitHub.',
  'speedtest': 'Testa a velocidade da sua internet baixando um arquivo de teste. O resultado mostra quantos Megabits por segundo (Mbps) sua conexão consegue baixar.',
  'disco-abrir': 'Abre o gerenciador de arquivos do seu sistema na pasta deste disco, para você ver e organizar seus arquivos e pastas.',
  'disco-analisar': 'Escaneia as pastas mais pesadas deste disco, mostrando o que está ocupando mais espaço. Útil para encontrar arquivos grandes e liberar espaço.',
  'disco-particoes': 'Mostra a tabela de partições do disco, com informações detalhadas: nome, tamanho, tipo e onde está montada cada partição.',
  'section-pacotes': 'Instale pacotes .deb ou .rpm baixados da internet. O Solix mostra as informações do pacote, verifica se é compatível com seu sistema, e só instala após sua confirmação.',
  'section-analisador': 'Arraste um arquivo .sh para analisar. O Solix mostra cada comando, explica o que faz em português e classifica o nível de risco do script.',
};

/** Retorna o texto educativo para uma chave, ou null se desconhecida. */
export function getTooltip(key: string): string | null {
  return tooltips[key] ?? null;
}

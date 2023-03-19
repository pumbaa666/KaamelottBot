// Clear local cached files
function clearCache(interaction) {
    // demander confirmation en pressant sur un bouton
    // seulement pour les admins

    // Check if the user is an admin
    if(!interaction.member.roles.cache.some(role => role.name === 'Admin')) {
        interaction.reply("You're not an admin !");
        return;
    }

    // TODO clearCache
    const cacheDirectory = getCacheFilePath("");
    
}

function refreshSoundsList() {
    // TODO refreshSoundsList
    // a relancer toutes les 24h
    // Sinon faut restart le serveur pour MAJ la liste des sons quand y'a une MAJ du github kaamelott-soundboard
}

module.exports = {
    kaamelottAudio,
    clearCache,
    refreshSoundsList,
};
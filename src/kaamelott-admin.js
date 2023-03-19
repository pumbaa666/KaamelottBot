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

module.exports = {
    kaamelottAudio,
    clearCache,
    refreshSoundsList,
};
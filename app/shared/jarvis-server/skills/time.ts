export function getTime() {
    const now = new Date();
    return "Ora curentă este " + now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0') + ".";
}

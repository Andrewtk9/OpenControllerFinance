// Impede expor o app na rede sem senha configurada
import "dotenv/config";

if (!process.env.AUTH_PASSWORD) {
  console.error(
    "\n⛔ AUTH_PASSWORD não está definida no .env.\n" +
      "Para expor o app na rede (uso pelo celular/APK), defina uma senha:\n" +
      '  AUTH_PASSWORD="sua-senha-forte"\n'
  );
  process.exit(1);
}

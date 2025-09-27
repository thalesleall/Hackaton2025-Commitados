import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Logo from "../assets/logo.png"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LoginUsuario } from "@/service/api"

export default function Login() {
  const [email, setEmail] = useState<string>("")
  const [senha, setSenha] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setIsLoading(true)

    if (!email) {
      setErrorMessage("Por favor, informe seu e-mail ou CPF.")
      setIsLoading(false)
      return
    }

    if (!senha) {
      setErrorMessage("Por favor, informe sua senha.")
      setIsLoading(false)
      return
    }

    try {
      const response = await LoginUsuario(email, senha)

      if (response.data.user.id) {
        localStorage.setItem("idUser", response.data.user.id )
        localStorage.setItem("authToken", response.data.session.access_token )
        navigate("/home")
      } else {
        setErrorMessage(response.error.message || "Falha na autenticação.")
      }
    } catch (err) {
      setErrorMessage("Erro inesperado. Tente novamente mais tarde.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-dvh grid grid-cols-1 bg-[radial-gradient(1200px_1200px_at_100%_-200px,rgba(0,168,89,.12),transparent_60%)] bg-[#f6f8f7] p-6">
      <div className="w-full max-w-xl mx-auto flex items-center">
        <Card className="w-full border-[#e9efec] shadow-md rounded-2xl">
          <CardHeader className="items-center space-y">
            <img src={Logo} alt="Unimed" className="h-16 object-contain" />
            <CardTitle className="text-2xl font-bold text-[#1d252a]">Entrar</CardTitle>
            <p className="text-md text-[#6b7a85] -mt-2">
              Acesse sua conta para continuar
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="font-semibold text-sm">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8aa39a]" />
                  <Input
                    id="identifier"
                    placeholder="Digite seu e-mail"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold text-sm">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8aa39a]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    className="pl-10"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full h-11 rounded-xl font-bold bg-[#00A859] hover:bg-[#00924e]"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

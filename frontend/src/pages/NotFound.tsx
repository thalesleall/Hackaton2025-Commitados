import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import Logo from "../assets/logo.png"
import { AlertCircle } from "lucide-react"

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#f6f8f7] p-6">
      <Card className="w-full max-w-lg border-[#e9efec] shadow-md rounded-2xl text-center">
        <CardContent className="space-y-6 p-8">
          <img src={Logo} alt="Unimed" className="h-20 mx-auto" />

          <div className="space-y-2">
            <AlertCircle className="w-12 h-12 text-[#00A859] mx-auto" />
            <h1 className="text-3xl font-bold text-[#1d252a]">Página não encontrada</h1>
            <p className="text-[#6b7a85]">
              O endereço que você tentou acessar não existe ou foi removido.
            </p>
          </div>

          <Button
            className="w-full h-11 rounded-xl font-bold bg-[#00A859] hover:bg-[#00924e]"
            onClick={() => navigate("/")}
          >
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

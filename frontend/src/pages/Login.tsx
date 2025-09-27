import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Logo  from "../assets/logo.png"

export default function Login() {
  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-2 bg-[radial-gradient(1200px_1200px_at_100%_-200px,rgba(0,168,89,.12),transparent_60%)] bg-[#f6f8f7] p-6">
      <div className="w-full max-w-xl mx-auto flex items-center">
        <Card className="w-full border-[#e9efec] shadow-md rounded-2xl">
          <CardHeader className="items-center space-y">
            <img
              src={Logo}
              alt="Unimed"
              className="h-16 object-contain"
            />
            <CardTitle className="text-2xl font-bold text-[#1d252a]">Entrar</CardTitle>
            <p className="text-md text-[#6b7a85] -mt-2">Acesse sua conta para continuar</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="font-semibold text-sm">CPF ou e‑mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8aa39a]" />
                <Input id="identifier" placeholder="Digite seu e‑mail" className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-sm">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8aa39a]" />
                <Input id="password" type="password" placeholder="Digite sua senha" className="pl-10" />
              </div>
            </div>

            <Button className="w-full h-11 rounded-xl font-bold bg-[#00A859] hover:bg-[#00924e]">
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

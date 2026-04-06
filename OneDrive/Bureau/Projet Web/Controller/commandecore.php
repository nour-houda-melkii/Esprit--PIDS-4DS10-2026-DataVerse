<?PHP
include "C:/xampp/htdocs/Crudx/config.php";
include "../connection.php";
class commandecore 
{
function affichecommande ($commande)
    {
		echo "id_Produit: ".$commande->getid_Produit()."<br>";
		echo "Nom_Commande: ".$commande->getNom_Commande()."<br>";
		echo "id_Client: ".$commande->getid_Client()."<br>";
		echo " Prix: ".$commande->getPrix()."<br>";
        echo "Date_Commande: ".$commande->getDate_Commande()."<br>";
        echo "id_Commande: ".$commande->getid_Commande()."<br>";
        echo "Etat: ".$commande->getEtat()."<br>";

	}
	
	function ajoutercommande($commande){
		$sql="insert into commande (id_Produit,Nom_Commande,id_Client,Prix,Date_Commande,Etat) values (:idProduit, :Nom_Commande0,:idClient,:Prix0,:DateCommande,:Etat0)";
		$db = config::getConnexion();
		try{
        $req=$db->prepare($sql);

        $id_Produit=$commande->getid_Produit();
        $Nom_Commande=$commande->getNom_Commande();
        $id_Client=$commande->getid_Client();
        $Prix=$commande->getPrix();
        $Date_Commande=date("Y-m-d") ;
        $id_Commande=$commande->getid_Commande();
        $Etat=$commande->getEtat();
		$req->bindValue(':idProduit',$id_Produit);
		$req->bindValue(':Nom_Commande0',$Nom_Commande);
		$req->bindValue(':idClient',$id_Client);
		$req->bindValue(':Prix0',$Prix);
        $req->bindValue(':DateCommande',$Date_Commande);
        $req->bindValue(':Etat0',$Etat);

		
            $req->execute();
           
        }
        catch (Exception $e){
            echo 'Erreur: '.$e->getMessage();
        }
		
	}
	
    function affichercommande()
    {
		$sql="SElECT * From commande";
		$db = config::getConnexion();
		try{
		$liste=$db->query($sql);
		return $liste;
		}
        catch (Exception $e){
            die('Erreur: '.$e->getMessage());
        }	
    }
    
    function supprimercommande($id_Commande)
    {
		$sql="DELETE FROM commande where id_Commande= :id_Commande";
		$db = config::getConnexion();
        $req=$db->prepare($sql);
		$req->bindValue(':id_Commande',$id_Commande);
		try{
            $req->execute();
        }
        catch (Exception $e){
            die('Erreur: '.$e->getMessage());
        }
    }
    
	function modifiercommande($commande,$id_Commande){
		$sql="UPDATE commande SET id_Produit=:id_Produit0, Nom_Commande=:Nom_Commande, id_Client=:id_Client, Prix=:Prix, Date_Commande=:Date_Commande WHERE id_Produit=:id_Produit";
		
		$db = config::getConnexion();
try{		
        $req=$db->prepare($sql);
		$id_Produit0=$commande->getid_Produit();
        $Nom_Commande=$commande->getNom_Commande();
        $id_Client=$commande->getid_Client();
        $Prix=$commande->getPrix();
        $Date_Commande=$commande->getDate_Commande();
		$datas = array(':id_Produit0'=>$id_Produit0, ':Nom_Commande'=>$Nom_Commande, ':id_Client'=>$id_Client, ':Prix'=>$Prix,':Date_Commande'=>$Date_Commande, ':id_Commande'=>$id_Commande);
		$req->bindValue(':id_Produit0',$id_Produit0);
		$req->bindValue(':Nom_Commande',$Nom_Commande);
		$req->bindValue(':id_Client',$id_Client);
		$req->bindValue(':Prix',$Prix);
        $req->bindValue(':Date_Commande',$Date_Commande);
		
		
            $s=$req->execute();
			

        }
        catch (Exception $e){
            echo " Erreur ! ".$e->getMessage();
   echo " Les datas : " ;
  print_r($datas);
        }
		
    }
    
    function recuperercommande($id_Commande)
    {
		$sql="SELECT * from commande where id_Commande=$id_Commande";
		$db = config::getConnexion();
		try{
		$liste=$db->query($sql);
		return $liste;
		}
        catch (Exception $e){
            die('Erreur: '.$e->getMessage());
        }
	}
	
    function rechercherlistecommande($id_Commande)
    {
		$sql="SELECT * from commande where id_Commande=$id_Commande";
		$db = config::getConnexion();
		try{
		$liste=$db->query($sql);
		return $liste;
		}
        catch (Exception $e){
            die('Erreur: '.$e->getMessage());
        }
    }
    
    function somme()
    {
        $sql = 'SELECT SUM(Prix) as Prix_total FROM commande';  
        $conn = new mysqli('localhost', 'root', '', 'projet');
        $query = $conn->query($sql);
		$commande = $query->fetch_assoc();
        $somme=$commande['Prix_total'];
        return $somme;
    }
}

?>
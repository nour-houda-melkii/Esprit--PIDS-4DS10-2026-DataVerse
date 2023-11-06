<?PHP 
class commande{
	private $id_Produit;
	private $Nom_Commande;
	private $id_Client;
	private $Prix;
  private $Date_Commande;
  private $id_Commande;
  private $Etat;


    function __construct($id_Produit,$Nom_Commande,$id_Client,$Prix,$Date_Commande,$id_Commande,$Etat)
    {
		$this->id_Produit=$id_Produit;
		$this->Nom_Commande=$Nom_Commande;
		$this->id_Client=$id_Client;
		$this->Prix=$Prix;
    $this->Date_Commande=$Date_Commande;
    $this->Etat=$Etat;

	}
     
    //////////////////////////////////////////////////////////////

    function getid_Produit()
    {
		return $this->id_Produit;
    }
    
    function getNom_Commande()
    {
		return $this->Nom_Commande;
    }
    
    function getid_Client()
    {
		return $this->id_Client;
    }
    
    function getPrix()
    {
		return $this->Prix;
    }
    
    function getDate_Commande()
    {
		return $this->Date_Commande;
    }
    
    function getid_Commande()
    {
		return $this->id_Commande;
    }
    
    function getEtat()
    {
		return $this->Etat;
    }

    //////////////////////////////////////////////////////////////
    
    function setid_Produit($id_Produit)
    {
		$this->id_Produit=$id_Produit;
    }

    function setNom_Commande($Nom_Commande)
    {
		$this->Nom_Commande=$Nom_Commande;
    }
    
    function setid_Client($id_Client)
    {
		$this->id_Client;
    }
    
    function setPrix($Prix)
    {
		$this->Prix=$Prix;
    }
    
    function setDate_Commande($Date_Commande)
    {
		$this->Date_Commande;
    }
    
    function setid_Commande($id_Commande)
    {
		$this->id_Commande=$id_Commande;
    }

    function setEtat($Etat)
    {
		$this->Etat=$Etat;
    }
	
}

?>
<?PHP
include "../../Core/commandecore.php";
$commandecore=new commandecore();
if (isset($_POST["id_Commande"])){
	$commandecore->supprimercommande($_POST["id_Commande"]);
	header('Location: checkout.php');
}

?>
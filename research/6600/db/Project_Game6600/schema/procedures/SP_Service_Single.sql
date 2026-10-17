-- SQL_STORED_PROCEDURE dbo.SP_Service_Single (modified 2015-01-25T14:04:48.680)
CREATE  PROCEDURE [dbo].[SP_Service_Single]  
 @ID int
AS  

   begin 
     select * from Server_List WHERE ID=@ID 
   end

GO

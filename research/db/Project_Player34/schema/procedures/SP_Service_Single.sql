-- SQL_STORED_PROCEDURE dbo.SP_Service_Single (modified 2021-06-04T05:18:35.687)


CREATE  PROCEDURE [dbo].[SP_Service_Single]  
 @ID int
AS  

   begin 
     select * from Server_List WHERE ID=@ID 
   end








GO

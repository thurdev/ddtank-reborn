-- SQL_STORED_PROCEDURE dbo.SP_Server_Config_Update (modified 2021-06-04T05:18:35.677)






-- =============================================
-- Author:		<Justin>
-- ALTER  date: <2010-1-11>
-- Description:	<更新一条服务器配置信息>
-- =============================================
CREATE   PROCEDURE [dbo].[SP_Server_Config_Update]   
 @Key nvarchar(50), 
 @Value nvarchar(2000)
AS  
BEGIN 
     Declare @Counts Int 
     Declare @Maxs Int
     Select @Counts= IsNull(Count(*),0)  From Server_Config Where Name=@Key
     Select @Maxs=IsNull(Max(id),0)+1 From Server_Config

     If @Counts=1
         Update Server_Config Set Value=@Value Where  Name=@Key
     Else
         Insert Into Server_Config(Id,Name,Value) Values(@Maxs,@Key,@Value)

END







GO

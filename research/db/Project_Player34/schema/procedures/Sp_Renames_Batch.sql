-- SQL_STORED_PROCEDURE dbo.Sp_Renames_Batch (modified 2022-06-24T23:54:04.507)


















-- =============================================
-- Author:		<XiaoV>
-- Create date: <2009-09-25>
-- Description:	<用户提交后批量修改用户名与公会>
-- =============================================
CREATE PROCEDURE [dbo].[Sp_Renames_Batch]

AS
BEGIN

Declare  @Db_A NVarchar(100)  
Set  @Db_A='Project_Player34'
/*第一步修改用户昵称*/
  /*第一：将需要变更昵称的用户列出来*/
  Create Table #Temp_User(UserId Int,NickName nvarchar(50))    
  Exec('Insert Into  #Temp_User
   SELECT B.UserID,B.NickName FROM ( SELECT UserName,MAX(ID) ID FROM '+@Db_A+'.dbo.Rename_Nick 
         WHERE IsExist=1  GROUP BY UserName )A
               LEFT OUTER JOIN '+@Db_A+'.dbo.Rename_Nick B
                    ON A.ID=B.ID')
  Print '1'

  /*第二：更新Consortia的CreatorName、ChairmanName*/  
  Exec('Update A Set A.CreatorName=B.NickName From '+@Db_A+'.dbo.Consortia A ,#Temp_User B
         Where A.CreatorID=B.UserId')
  
  Exec('Update A Set A.ChairmanName=B.NickName From '+@Db_A+'.dbo.Consortia A,#Temp_User B
         Where A.ChairmanID=B.UserId')
  Print '2'

  /*第三：更新Consortia_Apply_Users的UserName*/
  Exec('Update A Set A.UserName=B.NickName From '+@Db_A+'.dbo.Consortia_Apply_Users A ,#Temp_User B
         Where A.UserID=B.UserId')
  Print '3' 

  /*第四：更新Consortia_Invite_Users的UserName、InviteName*/      
  Exec('Update A Set A.UserName=B.NickName From '+@Db_A+'.dbo.Consortia_Invite_Users A,#Temp_User B
         Where A.UserID=B.UserId')

  Exec('Update A Set A.InviteName=B.NickName From '+@Db_A+'.dbo.Consortia_Invite_Users A,#Temp_User B
         Where A.InviteID=B.UserId')
  Print '4'

  /*第五：更新Consortia_Users的UserName	RatifierName*/  
  Exec('Update A Set A.UserName=B.NickName From '+@Db_A+'.dbo.Consortia_Users A ,#Temp_User B 
         Where A.UserID=B.UserId')

  Exec('Update A Set A.RatifierName=B.NickName From '+@Db_A+'.dbo.Consortia_Users A,#Temp_User B
         Where A.RatifierID=B.UserId')
  Print '5'

  /*第六：Marry_Apply的ApplyUserName*/
  Exec('Update A Set A.ApplyUserName=B.NickName From '+@Db_A+'.dbo.Marry_Apply A,#Temp_User B
         Where A.ApplyUserID=B.UserId')
  Print '6'  

  /*第七：Marry_Room_Info的PlayerName、GroomName、BrideName*/
  Exec('Update A Set A.PlayerName=B.NickName From '+@Db_A+'.dbo.Marry_Room_Info A,#Temp_User B
         Where A.PlayerID=B.UserId')

  Exec('Update A Set A.GroomName=B.NickName From '+@Db_A+'.dbo.Marry_Room_Info A,#Temp_User B
         Where A.GroomID=B.UserId')
  

  Exec('Update A Set A.BrideName=B.NickName From '+@Db_A+'.dbo.Marry_Room_Info A,#Temp_User B
         Where A.BrideID=B.UserId')
 
  Print '7'

  /*第八:User_Messages的Receiver、Sender*/
  Exec('Update A Set A.Receiver=B.NickName From '+@Db_A+'.dbo.User_Messages A,#Temp_User B
         Where A.ReceiverID=B.UserId')
  
  Exec('Update A Set A.Sender=B.NickName From '+@Db_A+'.dbo.User_Messages A,#Temp_User B
         Where A.SenderID=B.UserId')
  Print '8'

  /*第九：更新更新Sys_Users_Detail的SpouseName*/
  Exec('Update A Set A.SpouseName=B.NickName From '+@Db_A+'.dbo.Sys_Users_Detail A,#Temp_User B
        Where A.SpouseID=B.UserId')

  Exec('Update A Set A.NickName=B.NickName From '+@Db_A+'.dbo.Sys_Users_Detail A,#Temp_User B
        Where A.UserId=B.UserId')
  Print '9'

  /*第十:更新Auction的AuctioneerName、BuyerName*/
  Exec('Update A Set A.AuctioneerName=B.NickName From '+@Db_A+'.dbo.Auction A,#Temp_User B
        Where A.AuctioneerID=B.UserId')
  Print '10'

  Exec('Update A Set A.BuyerName=B.NickName From '+@Db_A+'.dbo.Auction A,#Temp_User B
        Where A.BuyerID=B.UserId')
  Print '11'

 
  /*第十：清除批处理数据*/
  Exec('Update  '+@Db_A+'.dbo.Rename_Nick Set IsExist=0  Where IsExist=1')
  Drop Table #Temp_User

/*第二步：修改工会昵称*/
  Create Table #Temp_Consortia(ConsortiaID Int,ConsortiaName nvarchar(200))    
  Exec('Insert Into #Temp_Consortia
  Select ConsortiaID,ConsortiaName From  '+@Db_A+'.dbo.Rename_Consortia  Where  IsExist=1')

  Print '12'

  /*第一：Consortia_Apply_Users的ConsortiaName*/
  Exec('Update A Set A.ConsortiaName=B.ConsortiaName From '+@Db_A+'.dbo.Consortia_Apply_Users A,#Temp_Consortia B
         Where A.ConsortiaID=B.ConsortiaID')
  Print '13'
  
  /*第二：Consortia_Invite_Users的ConsortiaName*/
  Exec('Update A Set A.ConsortiaName=B.ConsortiaName From '+@Db_A+'.dbo.Consortia_Invite_Users A,#Temp_Consortia B
         Where A.ConsortiaID=B.ConsortiaID')
  Print '14'
   
  /*第三：Consortia的ConsortiaName*/
  Exec('Update A Set A.ConsortiaName=B.ConsortiaName From '+@Db_A+'.dbo.Consortia A,#Temp_Consortia B
         Where A.ConsortiaID=B.ConsortiaID')
  Print '15'

  /*清除批处理数据*/
  Exec('Update  '+@Db_A+'.dbo.Rename_Consortia Set IsExist=0  Where IsExist=1')
  Drop Table #Temp_Consortia
END







GO
